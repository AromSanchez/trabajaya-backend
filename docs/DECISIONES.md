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
- **Precio y alcance:** se acordarán cuando exista el chat (T9). **Pendiente en PROGRESS.md.**
- **Datos de la solicitud:** el cliente envía `tecnico_id`, `descripcion` (obligatoria, máximo 500), `fecha_hora` deseadas (futura), `distrito` y `direccion` exacta. Fotos del problema **opcionales** (máximo 3, jpg o png, máximo 5 MB por archivo) subidas como archivos privados en Cloudinary. No hay referencia, precio ni alcance.
- **Privacidad:** el técnico ve desde `pendiente` la descripción, las fotos, la fecha y hora, y el distrito; la **dirección exacta solo aparece cuando el servicio está `aceptado` o posterior**. Nunca se comparten teléfono ni correo del cliente (solo su nombre).
- **Una solicitud, un técnico:** solo se puede solicitar a técnicos `verificado`, no suspendidos y con `disponible = true`; si no, `409` con mensaje claro. Un cliente no puede tener más de una solicitud `pendiente` con el mismo técnico, ni más de **3 pendientes** en total (`409`).
- **Historial de servicio:** tabla `HistorialServicio` (solo inserción, nunca se edita ni borra) con servicio, actor (`actorId`/`actorRol`), estado anterior/nuevo, motivo y fecha. Cada cambio de estado y su registro van en **una sola transacción**. Para la expiración automática no hay usuario: `actorId = null` y `actorRol = sistema`.

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


