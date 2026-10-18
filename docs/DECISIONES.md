# DECISIONES — Backend de Trabajo Ya

> Registro de decisiones de negocio y de arquitectura del proyecto.
> Cada decisión se anota aquí **en la misma tarea en que se toma** (ver AGENTS.md, Reglas de trabajo).
> Formato: sección · decisión · motivo cuando aplique.

## Negocio

### Registro y roles
- **Registro por app con dos endpoints:** `POST /auth/cliente/registro` y `POST /auth/tecnico/registro`.
  - El body **nunca incluye `rol`**: el rol lo fija el endpoint en el backend. La app no puede elegir el rol.
- **Rol `admin` nunca por registro público:** se crea solo con un seed o un script manual.
- **Un mismo email = un solo rol:** tabla única `Usuario` con `email` único. No se puede tener la misma cuenta como cliente y como técnico.
- **Login por app, un solo rol por app:** cada aplicación solo acepta el login de su propio rol.
  - App del cliente → solo `cliente` (`POST /auth/cliente/login`).
  - App del técnico → solo `tecnico` (`POST /auth/tecnico/login`).
  - Web de administración → solo `admin` (`POST /auth/admin/login`).
  - Si el rol no coincide, se responde `401 Credenciales incorrectas` (el mismo mensaje que una contraseña errónea, para no revelar qué cuentas existen).
- **Un técnico nuevo nace "pendiente":** al registrarse un técnico se crea su perfil `Tecnico` con `estadoVerificacion: "pendiente"`. Aprobar/observar/rechazar es trabajo del admin (T6).
- **Estados de verificación:** `pendiente`, `en_revision`, `verificado`, `observado`, `rechazado`, `suspendido`.
  - **`verificado` reemplaza a `aprobado`** (renombrado en T6): es el estado del técnico aprobado y activo. No confundir con `EstadoDocumento.aprobado`, que es el estado de cada documento.
  - **`suspendido`** (T6): un técnico verificado suspendido por el admin (por reportes o incidencias graves).
- **La verificación y la comisión se calculan solo en el backend**, nunca confiando en lo que envía la app.

### Perfil del técnico (T4)
- **Un solo oficio por técnico:** enum `Oficio = { gasfiteria, electricidad, carpinteria, albanileria, pintura }`. El técnico elige exactamente uno.
- **Zona de cobertura = distritos de la provincia de Trujillo:** catálogo fijo (enum `Distrito`) con los 11 distritos: `trujillo`, `el_porvenir`, `florencia_de_mora`, `huanchaco`, `la_esperanza`, `laredo`, `moche`, `poroto`, `salaverry`, `simbal`, `victor_larco_herrera`. El técnico elige uno o varios.
  - Los valores internos son identificadores ASCII (sin tildes ni espacios): `albanileria` (no "albañilería") y `victor_larco_herrera` (no "Víctor Larco Herrera"). La app se encarga de mostrarlos con su forma legible.
- **Experiencia:** `aniosExperiencia` (entero ≥ 0) + `descripcion` (texto libre, opcional).
- **Disponibilidad estructurada:** lista de rangos por día de la semana (`dia`, `desde`, `hasta`), con horas en formato `HH:MM` y sin repetir el mismo día. Se guarda como `Json` en la columna `disponibilidad`.
- **Sin tarifa en el perfil:** el precio se define en la solicitud de servicio (T8), no en el perfil.
- **El perfil es privado del propio técnico en T4:** `GET` y `PUT /tecnicos/perfil` están protegidos con `autenticar` + `autorizar("tecnico")` y operan sobre el perfil del dueño del token. El perfil público del técnico es T7.

### Alcance del MVP
- **Google OAuth se posterga y queda fuera del MVP.** De momento el único login es con email y contraseña (JWT). El login con Google (T3) se implementará más adelante. En consecuencia, no se piden aún `GOOGLE_CLIENT_ID` ni `GOOGLE_CLIENT_SECRET`.

### Verificación del técnico — documentos (T5)
- **Documentos de verificación (privados):** `dni_frente`, `dni_reverso`, `selfie` (obligatorios), `cul` y `certificado_oficio` (opcionales). Se guardan como archivos privados en Cloudinary; nunca con URL pública (la selfie tampoco).
- **La foto de perfil es aparte:** `foto_perfil` es pública, **no** forma parte de la verificación y se implementará en una tarea posterior.
- **Comparación de rostro manual:** el admin compara la selfie con el DNI a ojo. No se usa reconocimiento facial.
- **Para enviar a revisión** se exigen al menos los tres obligatorios. `POST /tecnicos/verificacion/enviar` los valida y, si falta alguno, responde `400` indicando cuáles (`detalles.faltantes`).
- **Ciclo de envío:** al enviar, `estadoVerificacion` pasa de `pendiente`/`observado` a `en_revision` y se guarda `documentosEnviadosAt`. Mientras está `en_revision`, el técnico **no** puede subir ni borrar documentos. Si el admin observa documentos (`EstadoDocumento = observado`), el técnico corrige y reenvía; el reenvío reinicia el estado de todos los documentos a `pendiente` y limpia `comentarioAdmin`.
- **Estado por documento:** cada `DocumentoVerificacion` tiene `estado` (`pendiente` | `aprobado` | `observado`) y `comentarioAdmin` (lo llena el admin en T6).
- **Un archivo por request**, campo `archivo` (multipart). Formatos jpg/png/pdf; la selfie solo jpg/png. Tamaño máximo 5 MB por archivo.
- **Reemplazo vs. acumulación:** los tipos obligatorios reemplazan el documento anterior (se borra el previo en Cloudinary); los opcionales (`cul`, `certificado_oficio`) se agregan.

### Panel de administración — revisión de técnicos (T6)
- **El admin revisa por documento y luego al técnico:** marca cada documento como `aprobado` u `observado` (con `comentarioAdmin`) y luego decide el estado del técnico.
- **Solo desde `en_revision`:** el admin solo puede aprobar/observar/rechazar técnicos en `en_revision`. Si intenta hacerlo desde otro estado, responde `409`.
- **Aprobar → `verificado`:** al aprobar, **todos** los documentos del técnico pasan a `aprobado`.
- **Observar → `observado`:** el técnico ve los documentos observados (con el comentario del admin), los corrige y vuelve a enviar a revisión (T5).
- **Rechazar → `rechazado` (definitivo):** el técnico no puede volver a enviar a revisión. Su verificación terminó.
- **Suspensión y reactivación (excepción a la regla anterior):**
  - El admin puede **suspender** a un técnico en estado `verificado` (por reportes o incidencias graves). La suspensión exige un **motivo obligatorio**. Pasa a `suspendido`.
  - Un técnico `suspendido` no aparecerá en las búsquedas del cliente ni podrá recibir solicitudes nuevas (se aplicará en T7/T8).
  - El admin puede **reactivarlo**: de `suspendido` a `verificado`, también con motivo obligatorio.
  - Suspender/reactivar solo proceden desde `verificado`/`suspendido` respectivamente; si no, `409`.
- **Historial de cambios de estado:** cada acción del admin (aprobar, observar, rechazar, suspender, reactivar) se registra en `HistorialVerificacion` con: técnico, admin (quién lo hizo), estado anterior, estado nuevo, comentario/motivo y fecha. Los envíos del técnico no van aquí (su fecha queda en `Tecnico.documentosEnviadosAt`), porque el historial exige un admin.
- **Admin por seed:** el rol `admin` se crea con `npm run seed:admin` (lee `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NOMBRE`; por defecto `admin@trabajoya.com` / `123456`). **Cambiar la contraseña por defecto** en cualquier entorno real.

### Búsqueda y perfil público del técnico (T7)
- **Solo clientes autenticados:** `GET /tecnicos` (búsqueda) y `GET /tecnicos/:id` (perfil público) exigen rol `cliente`. Un técnico no puede usar la búsqueda.
- **Qué técnicos se muestran:** únicamente los `verificado` **y** con perfil completo (`oficio` definido). Quedan fuera `pendiente`, `en_revision`, `observado`, `rechazado` y `suspendido`, así como los verificados sin oficio.
- **Filtros:** `oficio` (uno), `distrito` (coincide si está en la lista de cobertura del técnico) y `nombre` (texto libre, case-insensitive). Todos opcionales y combinables.
- **Datos públicos:** nombre, oficio, `descripcion`, años de experiencia, especialidades, distritos, disponibilidad (estado actual `disponible` + horario semanal), distintivo `verificado` y, cuando existan (T8/T10), calificación promedio, número de reseñas y servicios completados. **Nunca** se exponen correo, teléfono, dirección, DNI, selfie, documentos ni historial de verificación.
- **Especialidades:** campo nuevo del técnico (`Tecnico.especialidades`, máximo 5, cada una ≤ 40 caracteres, sin duplicados, normalizadas con `trim`). No reemplazan al oficio (sigue siendo uno solo) ni se usan como filtro todavía. El catálogo de sugerencias por oficio se expone en `GET /oficios/:id/especialidades`; el técnico puede escribir las suyas.
- **Disponibilidad actual vs. horario:** `disponible` (booleano, interruptor manual del técnico) indica si está disponible ahora; es independiente del horario semanal (`disponibilidad`). Ambos se editan en `PUT /tecnicos/perfil` (T4 ampliado).
- **Orden por defecto:** `disponible` desc → `aniosExperiencia` desc → `id` asc. Cuando existan reseñas (T10) y servicios (T8), la calificación y los servicios completados se antepondrán al desempate por experiencia. Sin parámetro de orden configurable.
- **Paginación:** `page` (default 1) y `limit` (default 20, tope 50). El tope se recorta, no da error. La respuesta incluye `page`, `limit`, `total` y `total_paginas`; una página fuera de rango devuelve lista vacía.

### Solicitud de servicio (T8)
- **Estados del servicio:** enum propio `EstadoServicio = { pendiente, aceptado, completado, rechazado, cancelado, expirado }`. Flujo normal `pendiente → aceptado → completado`; finales alternativos `rechazado`, `cancelado`, `expirado`. **No** existen `en_camino`, `en_proceso` ni `confirmado` (quedan para una fase posterior). Solo los servicios `completado` permitirán reseña (T10) y contarán para el historial y el número de servicios del técnico.
- **Quién cambia cada estado:**
  - El **cliente** crea la solicitud (`pendiente`).
  - El **técnico** acepta o rechaza (rechazar exige motivo).
  - **Completar:** cualquiera de los dos (cliente o técnico), solo desde `aceptado` y solo si ya llegó la fecha y hora solicitadas; se guarda quién lo marcó (`completadoPorId`/`completadoPorRol`) y cuándo (`completadoAt`).
  - **Cancelar** (motivo obligatorio): el cliente desde `pendiente` o `aceptado`; el técnico solo desde `aceptado`. Si se cancela desde `aceptado` con menos de 2 horas para la hora solicitada, se marca `cancelacionTardia = true`.
  - Una solicitud `pendiente` sin respuesta del técnico en **24 horas** pasa a `expirado`.
  - Cualquier otra transición responde `409`.
- **Control de cancelaciones:** se registra quién canceló (`canceladoPorId` + `canceladoPorRol`), el motivo y si fue tardía. El admin puede listarlas agrupadas por usuario en los últimos 30 días (ver endpoint abajo). No hay sanciones automáticas ni se muestran estas cifras al público.
- **Comisión:** durante la beta **no se cobra**. El porcentaje vive en la tabla `Configuracion` (clave `comision_porcentaje`, valor `0`), nunca fijo en el código; el servicio guarda el valor vigente al crearse en `comisionPorcentaje` (listo para activarse luego). No se calcula monto porque aún no hay precio ni alcance acordados.
- **Precio y alcance:** se acuerdan en el chat (resuelto en **T9**, ver abajo).
- **Datos de la solicitud:** el cliente envía `tecnico_id`, `descripcion` (obligatoria, máximo 500), `fecha_hora` deseadas (futura), `distrito` y `direccion` exacta. Fotos del problema **opcionales** (máximo 3, jpg o png, máximo 5 MB por archivo) subidas como archivos privados en Cloudinary. No hay referencia, precio ni alcance.
- **Privacidad:** el técnico ve desde `pendiente` la descripción, las fotos, la fecha y hora, y el distrito; la **dirección exacta solo aparece cuando el servicio está `aceptado` o posterior**. Nunca se comparten teléfono ni correo del cliente (solo su nombre).
- **Una solicitud, un técnico:** solo se puede solicitar a técnicos `verificado`, no suspendidos y con `disponible = true`; si no, `409` con mensaje claro. Un cliente no puede tener más de una solicitud `pendiente` con el mismo técnico, ni más de **3 pendientes** en total (`409`).
- **Historial de servicio:** tabla `HistorialServicio` (solo inserción, nunca se edita ni borra) con servicio, actor (`actorId`/`actorRol`), estado anterior/nuevo, motivo y fecha. Cada cambio de estado y su registro van en **una sola transacción**. Para la expiración automática no hay usuario: `actorId = null` y `actorRol = sistema`.

### Chat y acuerdo de precio/alcance (T9)
- **Chat por servicio:** cada conversación pertenece a un `Servicio`. Participan **solo el cliente dueño y el técnico asignado**; el **admin no accede** a las conversaciones (son privadas). Un tercero recibe `404` (no se revela que el servicio existe).
- **Ventana del chat:** se puede **escribir** mientras el servicio está `pendiente` o `aceptado`. Al llegar a un estado final (`completado`/`cancelado`/`rechazado`/`expirado`) el chat queda **solo lectura** (ver el historial sí, enviar no → `409`).
- **Contenido:** solo **texto** (1–1000 caracteres, se guarda con `trim`). Sin adjuntos por ahora.
- **Tiempo real:** Socket.IO autenticado en el handshake con el JWT (`auth.token`); sin token o inválido la conexión se rechaza. Los clientes entran a la sala `servicio:<id>` con `servicio:unirse` y envían con `mensaje:enviar`; el servidor persiste y difunde `mensaje:nuevo` a la sala. El historial también está disponible por REST.
- **Precio y alcance:** el **técnico propone** `monto` y `alcance`; el **cliente acepta** o **rechaza** (motivo opcional). Al aceptar se copian a `Servicio.montoAcordado` y `Servicio.alcanceAcordado`. Aceptar **no** cambia el estado del servicio. Solo puede haber **una propuesta pendiente** a la vez: al proponer de nuevo, la anterior queda `rechazada` ("Reemplazada por una nueva propuesta"). Se puede proponer solo en `pendiente`/`aceptado`.
- **Comisión:** sigue en 0 (beta). Con un `montoAcordado` la comisión monetaria **ya podría calcularse** más adelante, pero no se hace todavía.

### Reseñas e historial (T10)
- **Quién califica a quién:** solo el **cliente dueño** califica al **técnico** de un servicio. El técnico **no** califica al cliente en el MVP.
- **Solo servicios `completado`:** no se puede reseñar una solicitud en otro estado (`409`).
- **Una reseña por servicio, no editable:** se guarda una sola vez (relación 1:1 con `Servicio` mediante `servicioId` único) y no se puede editar ni borrar.
- **Contenido:** `calificacion` entera de **1 a 5** (obligatoria) y `comentario` de hasta 500 caracteres (opcional).
- **Reputación persistida:** al crear (u ocultar) una reseña, el backend recalcula en **una sola transacción** `Tecnico.calificacionPromedio` (media de las reseñas visibles, redondeada a 2 decimales; `null` si no hay) y `Tecnico.totalResenas`. `Tecnico.serviciosCompletados` se incrementa al completar un servicio. Estos tres valores son los que muestra el perfil público y usa la búsqueda (T7).
- **Historial:** `GET /cliente/servicios/historial` y `GET /tecnico/servicios/historial` listan los servicios del usuario (todos los estados, con filtro opcional por `estado`), paginados, cada uno con la reseña asociada. Cada usuario ve solo los suyos.
- **Reseñas en el perfil público:** `GET /tecnicos/:id/resenas` (solo rol `cliente`) lista las reseñas **no ocultas** de un técnico verificado, de la más reciente a la más antigua. El autor aparece como primer nombre + inicial del apellido (`"Ana T."`); nunca otros datos del cliente.
- **Moderación:** el admin puede **ocultar** una reseña con motivo obligatorio (`POST /admin/resenas/:id/ocultar`), **sin borrarla**; al ocultarla, el promedio se recalcula sin contar las ocultas y deja de aparecer en el listado público. El flujo de *reportes* de reseñas llega en T11; la ocultación ya queda disponible.
- **Comisión:** T10 no toca la comisión; sigue en 0.

### Reportes de incidencias (T11)
- **Siempre ligado a un servicio:** todo reporte apunta a un `Servicio` donde el reportante participó. No existen reportes libres a perfiles. Solo se puede reportar desde servicios en estado **`aceptado`, `completado` o `cancelado`** (`409` en cualquier otro).
- **Quién reporta a qué** (validado en el backend según el rol, nunca por el body):
  - El **cliente** reporta al **técnico** de un servicio suyo (`tipo_objetivo: "tecnico"`).
  - El **técnico** reporta al **cliente** de un servicio suyo (`tipo_objetivo: "cliente"`).
  - El **técnico** reporta una **reseña recibida** en su perfil (`tipo_objetivo: "resena"`, con `resena_id`); solo la reseña que le pertenece. El cliente **no** reporta reseñas.
  - Si el reportante no es participante del servicio, o la reseña no es suya, responde `404` (no se revela la existencia del recurso).
- **Categorías (una sola lista fija, obligatoria):** `no_se_presento`, `no_estaba`, `trabajo_deficiente`, `cobro_diferente`, `comportamiento_inapropiado`, `fraude`, `contenido_inapropiado`, `otro`.
  - **Válidas por objetivo:** contra técnico → `no_se_presento`, `trabajo_deficiente`, `cobro_diferente`, `comportamiento_inapropiado`, `fraude`, `otro`; contra cliente → `no_estaba`, `comportamiento_inapropiado`, `fraude`, `otro`; contra reseña → `contenido_inapropiado`, `fraude`, `otro`. Categoría que no corresponde al objetivo → `400`.
- **Comentario:** opcional, máximo 500 caracteres; **obligatorio** cuando la categoría es `fraude` u `otro` (si no, `400`).
- **Sin duplicados:** un reportante no puede crear dos reportes al mismo objetivo en el mismo servicio (`409`). La unicidad se controla por `reportanteId` + `servicioId` + `tipoObjetivo`.
- **El admin gestiona, no sanciona:** el admin lista/filtra los reportes y los marca como **`resuelto`** o **`descartado`** con una **nota obligatoria**. Las sanciones (suspender al técnico, ocultar la reseña) se aplican **manualmente** con los endpoints ya existentes (`POST /admin/tecnicos/:id/suspender`, `POST /admin/resenas/:id/ocultar`). El reporte **no** dispara sanciones automáticas.
- **Estados del reporte:** `pendiente` (al crearse) → `resuelto` o `descartado` (final). Resolver/descartar un reporte ya cerrado → `409`.

### Favoritos y notificaciones (T12)
- **Favoritos:** los marca **solo el cliente**, y solo sobre técnicos visibles en la búsqueda (estado `verificado` y con `oficio`); un técnico no guarda clientes favoritos. Sirven para acceder rápido a técnicos de confianza.
- **Favoritos idempotentes:** marcar un favorito ya existente no duplica ni da error (`200`); quitarlo siempre responde `204`, exista o no. Nunca `409`/`404` por repetir la acción. Un técnico que no cumple la condición de la búsqueda no se puede marcar (`404`).
- **Notificaciones in-app + Socket.IO:** no se usa push (FCM/APNs). Cada notificación se **persiste en la base** (leída/no leída) y además se **emite en vivo** por Socket.IO a la sala personal del usuario (`usuario:<id>`, evento `notificacion:nueva`). Si el usuario está desconectado, la ve al abrir la app por REST.
- **Eventos que generan notificación** (se notifica a **la otra parte**, nunca al actor):
  - Solicitud **nueva** (→ técnico), **aceptada**/**rechazada** (→ cliente).
  - Servicio **completado**/**cancelado** (→ el otro participante).
  - **Mensaje de chat** nuevo (→ el otro participante).
  - **Reseña recibida** (→ técnico).
  - **Verificación del técnico:** aprobado/observado/rechazado/suspendido (→ técnico). Reactivar emite `verificacion_aprobada`.
  - **Propuesta** nueva (→ cliente), aceptada/rechazada (→ técnico).
  - **Resolución de reporte:** resuelto/descartado (→ reportante).
- **Lectura:** nacen **no leídas**; el usuario puede marcar **una** o **todas** como leídas y consultar el **contador** de no leídas (`noLeidas`). **No** se pueden borrar (por ahora). Solo el dueño accede a las suyas (`404` si es ajena) y el **admin no** entra al módulo.
- **Las notificaciones no son estado de negocio:** se crean *best-effort* después de la operación principal; un fallo al notificar **no** revierte ni bloquea la acción (el chat, el servicio, la reseña o la resolución ya se guardaron).

### Métricas del panel de administración (T15)
- **Un solo endpoint para todo el panel:** `GET /admin/metricas/dashboard` devuelve en una sola llamada las tarjetas, series y distribuciones. El frontend arma los gráficos; el cálculo siempre es del backend.
- **Sin metas por ahora:** todavía no se definen la meta semanal de verificaciones ni la meta de tiempo (48 h), así que **no** se devuelven `meta` ni indicadores de cumplimiento, y **no** se crean claves en `Configuracion`. El panel muestra valores absolutos y tendencias.
- **Tiempo de verificación:** promedio desde `Tecnico.createdAt` (registro) hasta la **primera decisión** del admin (`HistorialVerificacion` con `estadoNuevo` ∈ `verificado`/`observado`/`rechazado`). Solo cuentan técnicos **ya decididos**; los que siguen `pendiente`/`en_revision` no entran. La comparación es último bloque de 30 días vs. los 30 anteriores.
- **Técnicos por oficio:** se agrupa por el enum `Oficio` (5 valores reales). El mockup con "Cerrajería/Otros oficios" no aplica al catálogo actual.
- **"En revisión" (tendencia):** se compara el número de técnicos que enviaron a revisión (`documentosEnviadosAt`) en los últimos 7 días contra los 7 anteriores. **Reportes abiertos** compara reportes creados últimos 7 días vs. 7 anteriores; `masDe48h` cuenta reportes `pendiente` con más de 48 h.
- **Cola de revisión:** técnicos `en_revision` ordenados por envío más antiguo primero, con días de espera y documentos faltantes (sobre los 5 tipos; en `en_revision` los 3 obligatorios ya están).
- **Series semanales:** desde el lunes (UTC). `registrosVerificaciones` usa los registros (`Tecnico.createdAt`) y las verificaciones (primeras decisiones hacia `verificado`) por semana; `cancelacionesTardiasSemanales` usa `Servicio.cancelacionTardia` agrupado por `canceladoAt`. Los periodos son por query con topes.

## Técnicas

### ORM y base de datos
- **Prisma 7 clásico (no la CLI 8-rc).** CLI `prisma@7.10.0` alineada con `@prisma/client@7.10.0`.
- **La URL de conexión vive solo en `prisma.config.ts`** (`defineConfig({ datasource: { url: env("DATABASE_URL") } })`). Prisma 7 prohíbe `url` en `schema.prisma`.
- **Cliente de runtime con driver adapter:** `new PrismaClient({ adapter: new PrismaPg(...) })` usando `@prisma/adapter-pg`. Singleton en `src/config/prisma.js`.
- **Generator `prisma-client-js`** (genera en `node_modules/@prisma/client`): el proyecto es CommonJS y el generator nuevo `prisma-client` emite ESM/TS, que no encaja aquí.
- **Todo cambio de esquema va en una migración de Prisma** (`prisma migrate dev`). Pide confirmación antes de borrar tablas o datos.
- **Verificar el cliente tras cambiar el schema:** en este entorno `prisma migrate dev` a veces no refresca el cliente generado; si un campo o modelo nuevo "no existe" en runtime (`Unknown field`), ejecutar `npx prisma generate` y reiniciar el servidor.
- **Reset de `mi_basedatos`:** el schema `public` traía escombro de un starter de Prisma (`Task` vacía + historial `20260714141918_init`). Con consentimiento explícito del usuario se ejecutó `prisma migrate reset` (Task tenía 0 filas) y se aplicó la migración propia `20261011025046_init`.

### Autenticación
- **Contraseñas con bcrypt** (10 rondas), almacenadas en `passwordHash`; nunca se devuelven.
- **JWT** firmado con `JWT_SECRET`; payload `{ sub: <id>, rol }`; expiración 7 días.
- **Endpoints de auth por app** (registro y login separados por rol), como se describió en Negocio.

### Autorización y permisos
- **Middleware `autenticar`** (`src/middlewares/auth.js`): lee `Authorization: Bearer <token>`, verifica el JWT con `JWT_SECRET` y expone `req.usuario = { id, rol }` (el `id` sale de `sub`). Sin encabezado o con token inválido/expirado responde `401`.
- **Middleware `autorizar(...rolesPermitidos)`**: exige que `req.usuario.rol` esté entre los roles permitidos; si no, responde `403`. Se usa siempre después de `autenticar`.
- **Datos propios solo desde el token:** los handlers identifican al usuario por `req.usuario.id`, nunca por `params` ni `body`, para que cada uno acceda únicamente a sus propios datos.
- **Códigos de error:** `401` no autenticado / token inválido o expirado; `403` autenticado pero sin permiso.
- **Endpoint de prueba:** `GET /auth/perfil` (protegido con `autenticar`) devuelve el perfil del dueño del token; sirve para cualquier rol.

### Código y validación
- **Zod 4** valida todo body/query/param (`src/middlewares/validate.js`); los controladores leen `req.validated`.
- **Respuestas JSON consistentes:** `{ "data": ... }` en éxito y `{ "error": "mensaje" }` en error (con `detalles` en errores de validación). Errores centralizados en `src/middlewares/errorHandler.js` con `ApiError`.
- **`ApiError` admite `detalles`:** `new ApiError(status, mensaje, detalles)`; el `errorHandler` los incluye como `detalles` en la respuesta cuando existen (p. ej. la lista de documentos faltantes).
- **Mensajes de error en español**, sin detalles internos.
- **Estructura de módulos:** cada módulo tiene rutas, controlador, servicio y esquemas Zod (`src/modules/<modulo>/`); middlewares en `src/middlewares/` y config en `src/config/`.
- **Memoria del proyecto en `docs/`:** `PROGRESS.md` (tareas), `DECISIONES.md` (este archivo) y `ENDPOINTS_{CLIENTE,TECNICO,ADMIN}.md` (endpoints con formato fijo).

### Archivos y Cloudinary (T5)
- **Cloudinary con SDK oficial** (`cloudinary`), configuración en `src/config/cloudinary.js` desde `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- **Subida privada:** `subirPrivado(buffer, carpeta)` sube con `resource_type: "auto"` y `type: "private"` bajo la carpeta `trabajoya/tecnicos`. Los documentos nunca se exponen con URL pública.
- **Acceso por URL firmada temporal:** `urlPrivada(publicId, formato, resourceType)` genera una `private_download_url`; solo el dueño (y el admin, en T6) la recibe. La firma expira.
- **`eliminarArchivo(publicId, resourceType)`** borra el recurso privado en Cloudinary (se usa al reemplazar y al eliminar).
- **Subida con Multer en memoria** (`src/middlewares/upload.js`): `memoryStorage`, límite de 5 MB y 1 archivo; los errores de Multer (`LIMIT_FILE_SIZE`) se traducen a `ApiError(400)` en español. El buffer se reenvía a Cloudinary, no se guarda en disco.
- **Modelo `DocumentoVerificacion`** (tabla `trabajoya`): guarda `publicId`, `resourceType`, `formato`, `nombreOriginal`, `bytes`, `estado` y `comentarioAdmin`. Nuevos enums `TipoDocumentoVerificacion` y `EstadoDocumento`; `EstadoVerificacion` suma el valor `en_revision`. `Tecnico` suma `documentosEnviadosAt` y la relación `documentos`. Migración `20261011050754_documentos_verificacion`.

### Panel de administración (T6)
- **Migración de enum a mano:** como no hay datos y `prisma migrate dev` es interactivo (aviso de pérdida de datos al renombrar `aprobado`), se creó la migración `20261011060000_admin_verificacion` a mano usando `ALTER TYPE "EstadoVerificacion" RENAME VALUE 'aprobado' TO 'verificado'` + `ADD VALUE 'suspendido'` (conserva filas) y se aplicó con `prisma migrate deploy`.
- **Modelo `HistorialVerificacion`:** `tecnicoId` (Cascade), `adminId` (Restrict), `estadoAnterior`, `estadoNuevo`, `comentario`, `createdAt`. Relaciones `Tecnico.historial` y `Usuario.historialVerificacion`.
- **Módulo `src/modules/admin/`:** rutas bajo `/admin`, todas protegidas con `autenticar` + `autorizar("admin")`.
- **Errores:** `409` cuando la acción no procede desde el estado actual del técnico; `404` técnico/documento inexistente; `400` validación (p. ej. motivo faltante).
- **Seed del admin:** `prisma/seed-admin.js` (script `npm run seed:admin`) hace `upsert` por email con `rol: admin` y `bcrypt`.

### Módulo de oficios y búsqueda (T7)
- **Módulo `src/modules/oficios/`:** catálogo `ESPECIALIDADES_POR_OFICIO` (5 sugerencias por oficio) y endpoint `GET /oficios/:id/especialidades` protegido solo con `autenticar` (lo usa cualquier rol). `:id` debe ser un `Oficio` válido; si no, `400`.
- **Auth por ruta en `tecnicos`:** se quitó el `router.use(autenticar, autorizar("tecnico"))` global y cada ruta declara su propio rol (`soloTecnico` / `soloCliente`), porque el módulo ahora sirve a dos roles. `GET /tecnicos/:id` va al final de la definición para no interceptar `/perfil` ni `/documentos`.
- **Migración `20261011060902_perfil_publico`:** aditiva; agrega `Tecnico.especialidades TEXT[] DEFAULT '{}'` y `Tecnico.disponible BOOLEAN DEFAULT false`.

### Servicios e historial (T8)
- **Enum auxiliar `RolActor = { cliente, tecnico, admin, sistema }`:** se usa solo para `actorRol`/`canceladoPorRol`/`completadoPorRol`, para no meter valores "de sistema" en el enum `Rol` de autenticación.
- **`actorId` nullable en `HistorialServicio`:** la expiración (`pendiente → expirado`) es automática y no tiene usuario; se registra con `actorId = null` y `actorRol = sistema`.
- **Expiración perezosa:** no hay cron ni cola. `expirarPendientes()` marca como `expirado` las solicitudes `pendiente` con `createdAt` de hace más de 24 h y se ejecuta al inicio de crear/listar/obtener/aceptar/rechazar/completar/cancelar. Es idempotente.
- **Migración `20261011063248_servicios`:** crea enums `EstadoServicio`/`RolActor`, las tablas `Configuracion`, `Servicio`, `FotoServicio` y `HistorialServicio`, y las relaciones nuevas en `Usuario`/`Tecnico`.
- **Configuración de comisión:** fila `comision_porcentaje = "0"` en `Configuracion`, creada por `npm run seed:admin` (upsert idempotente). El servicio lee el valor con fallback `0` si la fila no existe.
- **Fotos privadas:** `subirArchivos("fotos", 3)` (Multer en memoria) valida hasta 3 archivos de 5 MB; se suben con `subirPrivado` a `trabajoya/servicios`. Si falla la creación en BD, se borran de Cloudinary las fotos ya subidas.
- **Orden de respuesta al cliente:** el detalle listo se consulta **fuera** de la transacción (no dentro) para no leer datos sin confirmar; los cambios de estado se hacen y se registran dentro de una transacción, y luego se re-consulta y serializa.
- **Endpoint admin:** `GET /admin/cancelaciones-tardias` agrupa en memoria las cancelaciones tardías de los últimos 30 días por `canceladoPorId` + `canceladoPorRol` y las ordena de mayor a menor.

### Chat en tiempo real (T9)
- **Socket.IO sobre el servidor HTTP de Express:** `src/index.js` usa `http.createServer(app)` y `server.listen(...)`; `inicializarSocket(server)` (en `src/config/socket.js`) crea el `Server` de Socket.IO. Se expone un singleton con `obtenerIO()` para poder emitir desde los controladores REST.
- **Autenticación en el handshake:** middleware `io.use((socket, next) => ...)` que verifica `socket.handshake.auth.token` con `JWT_SECRET` y adjunta `socket.usuario = { id, rol }`. Sin token o inválido, la conexión se rechaza con un error.
- **Salas por servicio:** cada socket entra a la sala `servicio:<id>` con `servicio:unirse` (valida que sea participante). Los mensajes se difunden con `io.to("servicio:<id>").emit("mensaje:nuevo", { mensaje })`.
- **Reutilización de la lógica:** la validación de participación, la ventana del chat y la persistencia viven en `chat.service`; los usan tanto los endpoints REST como los handlers de Socket.IO. Los errores del socket se devuelven por el callback del evento y por `servicio:error`/`mensaje:error` (con el mismo mensaje en español; los errores inesperados se registran en consola y no se filtran detalles internos).
- **Modelos:** `Mensaje` (indexado por `[servicioId, createdAt]`) y `Propuesta`. `Servicio` gana `montoAcordado`/`alcanceAcordado` y relaciones `mensajes`/`propuestas`. Migración `20261011064613_chat_propuestas` (aditiva).
- **Propuestas:** solo una `pendiente` por servicio; el técnico puede reemplazarla (la anterior pasa a `rechazada`). Al aceptar, la propuesta queda `aceptada`, se registra quién respondió y se copian `monto`/`alcance` al servicio, todo en una transacción.
- **Dependencias:** `socket.io` en runtime; `socket.io-client` como `devDependency` solo para las pruebas.

### Reseñas e historial (T10)
- **Modelo `Resena`:** `servicioId` **único** (una por servicio, `onDelete: Cascade`), `clienteId`, `tecnicoId`, `calificacion`, `comentario?` y campos de moderación `oculta` (default `false`), `motivoOcultamiento?`, `ocultadaPorId?`, `ocultadaAt?`; índice `[tecnicoId, oculta]`. `Tecnico` suma `calificacionPromedio Float?`, `totalResenas Int` (default `0`), `serviciosCompletados Int` (default `0`) y relación `resenas`; `Servicio` suma `resena Resena?`; `Usuario` suma `resenasCliente`/`resenasOcultadas`. Migración `20261011070122_resenas` (aditiva).
- **Recálculo con `aggregate`:** `recalcularReputacion(tx, tecnicoId)` usa `tx.resena.aggregate({ where: { tecnicoId, oculta: false }, _avg: { calificacion }, _count: { _all } })` y actualiza el técnico. Se ejecuta dentro de la **misma transacción** al crear la reseña y al ocultarla.
- **Rutas nuevas:** el módulo `resenas` exporta tres routers: `cliente` (montado en `/cliente`), `tecnico` (montado en `/tecnico`) y `publicas` (montado en `/tecnicos`, ruta `/:id/resenas`). No choca con `GET /tecnicos/:id` porque `/:id` no captura dos segmentos.
- **Reutilización de serialización:** el historial reutiliza `serializar` y `SERVICIO_SELECT` (exportados por `servicios.service`) para mantener idéntica la regla de visibilidad de la `direccion`, y agrega el campo `resena`. `servicios.completar` incrementa `serviciosCompletados` en la misma transacción.
- **Ocultar desde el módulo admin:** `admin.service` importa `recalcularReputacion` de `resenas.service` para recalcular en la transacción de la ocultación (no hay dependencia circular: `resenas` no requiere `admin`).
- **Orden de búsqueda actualizado:** `disponible` desc → `calificacionPromedio` desc (`nulls: last`) → `serviciosCompletados` desc → `aniosExperiencia` desc (`nulls: last`) → `id` asc en `GET /tecnicos`.
- **Nombre público del autor:** helper que toma el primer nombre y la inicial del último apellido (`"Ana Torres"` → `"Ana T."`).

### Reportes de incidencias (T11)
- **Modelo `Reporte`:** `servicioId` (Cascade), `reportanteId`/`reportanteRol`, `tipoObjetivo` (`TipoObjetivoReporte`), objetivo polimórfico con `objetivoUsuarioId` (para `tecnico`/`cliente`) u `objetivoResenaId` (para `resena`), `categoria` (`CategoriaReporte`), `comentario?`, `estado` (`EstadoReporte`, default `pendiente`) y campos de resolución `resueltoPorId?`/`notaResolucion?`/`resueltoAt?`. Índices por `servicioId`, `estado` y `reportanteId`. `Usuario` suma `reportesCreados`/`reportesRecibidos`/`reportesResueltos`; `Servicio` suma `reportes`; `Resena` suma `reportes`. Migración `20261011182740_reportes` (aditiva).
- **Objetivo polimórfico:** `tipoObjetivo` decide cuál FK se llena; el backend la deriva del servicio (no se acepta un id de objetivo del cliente, para evitar suplantación). Para `tecnico`/`cliente` el objetivo es un `Usuario` (se resuelve desde el servicio); para `resena` se guarda `objetivoResenaId`. Un `select` común (`REPORTE_SELECT`) trae ambas relaciones opcionales y la serialización arma `objetivo` según el `tipoObjetivo`.
- **Validación de categoría por objetivo:** la lista fija está en el servicio (`CATEGORIAS_POR_OBJETIVO`) además del enum de Zod, porque la validez depende del objetivo (no se puede expresar solo en el esquema Zod del body). El comentario obligatorio (`fraude`/`otro`) también se valida en el servicio.
- **Anti-duplicado:** `findFirst({ reportanteId, servicioId, tipoObjetivo })` antes de crear → `409`. Como una reseña pertenece a un solo servicio, basta con el par `(servicio, tipoObjetivo)` para cubrir también las reseñas.
- **Módulo `src/modules/reportes/`:** exporta `router` (rol `cliente`/`tecnico`; `POST /reportes`) y `admin` (rol `admin`; `GET /admin/reportes`, `GET /admin/reportes/:id`, `PATCH /admin/reportes/:id`). En `index.js` se montan en `/reportes` y `/admin` respectivamente (el `admin` de reportes convive con `adminRoutes`, que no captura `/admin/reportes`).
- **Resolución:** `resolverReporte(adminId, id, { estado, nota })` exige estado `pendiente` (`409` si no) y guarda `resueltoPorId`/`notaResolucion`/`resueltoAt`. `estado` solo admite `resuelto`/`descartado` (Zod); `nota` es obligatoria (1–500).

### Despliegue en Render (T14)
- **Hosting:** el backend se despliega en Render como **Web Service** (Node) con la base PostgreSQL gestionada de Render. Conexión por la **Internal Database URL** en `DATABASE_URL`.
- **CORS abierto:** `app.use(cors())` permite **todos los orígenes** (las tres apps: cliente Flutter, técnico Flutter y web admin), sin restringir por lista.
- **Migraciones en el deploy:** como el repo ya tiene `prisma/migrations/`, la BD (aunque arranque vacía) se sincroniza con `npx prisma migrate deploy` dentro del **Build Command** (`npm ci && npx prisma generate && npx prisma migrate deploy`), porque Render ya no ofrece Pre-Deploy Command ni Shell. `prisma migrate deploy` es idempotente.
- **Seed de producción mínimo:** para el despliegue se usa `npm run seed:clientes` (solo admin + clientes de prueba), **sin técnicos** y **sin Cloudinary**; se ejecuta una sola vez contra la BD de Render.

### Favoritos y notificaciones (T12)
- **Modelo `Favorito`:** `clienteId` (Cascade), `tecnicoId` (Cascade), `@@unique([clienteId, tecnicoId])` e índice `[clienteId]`. `Usuario` suma `favoritos`; `Tecnico` suma `favoritos`. Marcar usa `upsert` sobre la clave compuesta (idempotente); quitar usa `deleteMany` (nunca falla si no existe). El listado reutiliza `DATOS_PUBLICOS_SELECT`/`tecnicoResumen` exportados por `tecnicos.service` y agrega `favoritoDesde`.
- **Modelo `Notificacion`:** `usuarioId` (Cascade), `tipo` (`TipoNotificacion`, 16 valores), `titulo` (obligatorio), `mensaje?`, `datos Json?` (referencias como `servicio_id`, `reporte_id`, `resena_id`, `monto`), `leida` (default `false`), `leidaAt?`, `createdAt`; índices `[usuarioId, leida]` y `[usuarioId, createdAt]`. `Usuario` suma `notificaciones`. Migración `20261011184212_favoritos_notificaciones` (aditiva).
- **Sala personal y emisión:** `socket.js` une cada conexión a `salaUsuario(id)` = `usuario:<id>` (además de la sala de servicio que ya se une a demanda). Se exporta `salaUsuario`. `notificaciones.service.crearYemitir` inserta la fila y emite `notificacion:nueva` con `{ notificacion }` serializada a esa sala.
- **Sin dependencia circular:** `notificaciones.service` **no** requiere `socket.js` en el nivel superior; lo hace de forma **perezosa** dentro de `emitir()` (porque `socket.js` requiere `chat.service`, que a su vez requiere `notificaciones.service`). Así el grafo de `require` no se cierra.
- **Best-effort:** `crearYemitir` envuelve todo en `try/catch` (loguea y devuelve `null`). Se invoca **después** de la transacción/estado principal en cada servicio, por lo que la notificación ya está persistida cuando responde el endpoint; un fallo de notificación no afecta la respuesta.
- **Serialización:** `NOTIFICACION_SELECT` incluye `usuarioId` solo para dirigir la emisión; el `serializar` público lo omite (el cliente no necesita su propio id). El modulo ofrece `listar` (con filtro `leida` y `noLeidas`), `contarNoLeidas`, `marcarLeida` (idempotente) y `marcarTodasLeidas` (`updateMany`).
- **Integraciones:** se agregaron llamadas a `crearYemitir` en `servicios.service` (7 puntos), `chat.service.enviarMensaje`, `resenas.service.crearResena`, `admin.service.registrarCambioEstado` (mapa por `estadoNuevo`) y `reportes.service.resolverReporte`. Para conocer al destinatario se ampliaron algunos `select` (p. ej. `clienteId` en aceptar/rechazar/propuesta; `tecnico.usuarioId` en servicio/reseña) y `obtenerTecnicoBasico` ahora trae `usuarioId`. Los emisores del chat funcionan tanto por REST como por Socket.IO (la notificación se crea una sola vez en `enviarMensaje`).
- **Montaje:** `index.js` monta `/favoritos` (solo `cliente`) y `/notificaciones` (`cliente`/`tecnico`).

### Métricas del panel admin (T15)
- **Módulo `src/modules/metricas/`:** `routes` (montado en `/admin/metricas` con `autenticar` + `autorizar("admin")`), `controller` y `service`. Se monta **antes** de `adminRoutes` en `index.js` para que `/admin/metricas/dashboard` no pase por el `router.use` de admin (evita autenticar dos veces).
- **Sin migración:** no hay cambios de esquema ni tablas nuevas; todo se calcula con agregaciones sobre lo existente.
- **Agregaciones:** `groupBy` de Prisma para estado de verificación, oficio y categoría de reporte; `count` para las tarjetas; el resto se arma en memoria a partir de consultas acotadas por rango de fechas (volúmenes pequeños en este proyecto).
- **Primeras decisiones:** se leen las filas de `HistorialVerificacion` con `estadoNuevo` ∈ `{verificado, observado, rechazado}` ordenadas por fecha y se conserva la primera por técnico (`Map`); esa lista alimenta la serie de verificados y el tiempo medio.
- **Semanas UTC:** helper `inicioSemanaUTC` fija el lunes 00:00 UTC y `serieSemanas(n)` genera las n semanas hasta la actual; el reparto por semana es O(items × semanas).
- **Zod:** `dashboardSchema` valida la query con `z.coerce.number().int().default(...)` y topes; sin parámetros, aplican los defaults. Códigos fuera de rango → `400 Datos inválidos`.


