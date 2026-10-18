# PROGRESS — Memoria del backend de Trabajo Ya

> El agente lee este archivo al empezar y lo actualiza al terminar cada tarea.
> Las decisiones de negocio y de arquitectura se registran en `docs/DECISIONES.md`.
> Solo una tarea puede estar "En curso" a la vez.

## En curso
- **T13 — Datos de prueba.**

> **Tarea siguiente:** T13 — Datos de prueba (T3 Google OAuth sigue postergada).

## Pendientes (en orden)
- [ ] T13 — Datos de prueba

## Postergadas (fuera del MVP por ahora)
- [ ] T3 — Login con Google OAuth *(se hará más adelante; no es parte del MVP)*

## Plan T15 — Métricas y gráficos del panel admin (hecho)

> Endpoint único para que el frontend del panel admin arme sus gráficos. Documentado en `docs/ENDPOINTS_ADMIN.md`.

### Mapeo mockup → datos
- **Tarjetas superiores:** reportes abiertos, técnicos totales, verificados y en revisión, cada una con tendencia ("2 menos que la semana pasada", "24 nuevos esta semana") y avisos (p. ej. "1 lleva más de 48 h").
- **Prioridad de hoy + meta semanal:** técnicos esperando revisión, el más antiguo en días y el progreso `hechas / meta` con porcentaje.
- **Registros y verificaciones:** serie de las últimas N semanas con dos series (`registrosNuevos`, `verificados`).
- **Técnicos por estado:** distribución por `EstadoVerificacion` (pendiente, en_revision, verificado, observado, rechazado, suspendido) con total y porcentaje.
- **Reportes por motivo:** conteo por `CategoriaReporte` de los últimos N días con porcentaje.
- **Cancelaciones tardías por semana:** serie semanal de servicios con `cancelacionTardia = true` (usa `canceladoAt`).
- **Técnicos por especialidad:** conteo por `Oficio` (el mockup trae "Cerrajería/Otros", pero el catálogo real solo tiene 5 oficios — ver pregunta abierta).
- **Cola de revisión:** técnicos `en_revision` más antiguos primero, con días esperando y estado de documentos (completos / cuántos faltan).
- **Tiempo medio de verificación:** promedio de horas entre el registro del técnico y la primera decisión del admin, vs. mes pasado y vs. meta.

### Endpoint propuesto — `GET /admin/metricas/dashboard`

Un **único** endpoint (decidido) que devuelve todos los bloques del panel. `Auth: admin`. Query opcional para los periodos: `semanas_registros` (default 12), `semanas_cancelaciones` (default 8), `dias_reportes` (default 30), `limit_cola` (default 5), con topes.

```
{ data: {
  generadoEn: "2026-10-18T15:00:00.000Z",
  prioridadHoy: { tecnicosEnEspera, masAntiguoDias },
  tarjetas: {
    reportesAbiertos: { total, vsSemanaPasada, masDe48h },
    tecnicosTotales: { total, nuevosSemana },
    verificados: { total, nuevosSemana, porcentajeDelTotal },
    enRevision: { total, vsSemanaPasada }
  },
  registrosVerificaciones: { semanas, serie: [{ semanaInicio, registrosNuevos, verificados }] },
  tecnicosPorEstado: { total, estados: [{ estado, total, porcentaje }] },
  reportesPorMotivo: { dias, total, motivos: [{ categoria, total, porcentaje }] },
  cancelacionesTardiasSemanales: { semanas, serie: [{ semanaInicio, total }], pico },
  tecnicosPorOficio: { total, oficios: [{ oficio, total, porcentaje }] },
  tiempoVerificacion: { promedioHoras, vsMesPasadoPorcentaje },
  colaRevision: { tecnicos: [{ id, nombre, oficio, distrito, diasEsperando, estadoDocumentos: "completos"|"faltan", faltantes, documentosEnviadosAt }] }
} }
```

### Decisiones tomadas (respuestas de esta sesión)
- **Metas aún no definidas:** no se muestran reportes de meta (ni `19/25` ni `48 h`). El panel muestra valores absolutos y tendencias; no se crean claves en `Configuracion` por ahora.
- **Tiempo de verificación:** promedio desde `Tecnico.createdAt` hasta la **primera decisión** del admin (`HistorialVerificacion` con `estadoNuevo` ∈ `verificado`/`observado`/`rechazado`). **Solo técnicos ya decididos** (los `pendiente`/`en_revision` no cuentan).
- **Técnicos por oficio:** se agrupa por el enum `Oficio` (5 valores reales). El mockup con "Cerrajería/Otros" no aplica.
- **Un solo endpoint:** `GET /admin/metricas/dashboard` (el frontend hace una sola llamada).
- **Tendencias:** se calculan en el backend (comparaciones contra la semana/mes anterior).
- **Periodos por query** con valores por defecto y tope.

### Notas de implementación
- Todo se calcula en el backend con agregaciones de Prisma / SQL (no confiar en la app).
- Módulo nuevo `src/modules/metricas/` (routes, controller, service, schemas Zod) montado en `/admin/metricas` (antes de `adminRoutes`).
- Documentado en `docs/ENDPOINTS_ADMIN.md`.

## Hechas
- [x] **T0 — Configuración inicial:** proyecto Express, Prisma 7, conexión a PostgreSQL, estructura de carpetas, `.env.example`, `.gitignore`. *(2026-10-10)*
- [x] **T1 — Registro y login con email y contraseña (JWT + bcrypt):** modelos `Usuario` y `Tecnico`, migración inicial, módulo `src/modules/auth` y endpoints por app. *(2026-10-11)*
- [x] **T2 — Roles y middleware de permisos:** `src/middlewares/auth.js` con `autenticar` (verifica JWT → `req.usuario = { id, rol }`) y `autorizar(...roles)` (403 si el rol no está permitido); endpoint protegido `GET /auth/perfil`. *(2026-10-11)*
- [x] **T4 — Perfil del técnico:** enums `Oficio` y `Distrito`, campos de perfil en `Tecnico`, módulo `src/modules/tecnicos` y endpoints `GET`/`PUT /tecnicos/perfil`. *(2026-10-11)*
- [x] **T5 — Subida de documentos de verificación (Cloudinary):** enums `TipoDocumentoVerificacion`/`EstadoDocumento`, modelo `DocumentoVerificacion`, estados de revisión, Multer (memoria, 5 MB) y endpoints `GET`/`POST`/`DELETE /tecnicos/documentos` y `POST /tecnicos/verificacion/enviar`. *(2026-10-11)*
- [x] **T6 — Admin: revisar, aprobar, observar o rechazar técnicos:** enum `verificado` (ex `aprobado`) y `suspendido`, modelo `HistorialVerificacion`, módulo `src/modules/admin` con listado/detalle, marcado de documentos, aprobar/observar/rechazar y suspender/reactivar, y seed de admin. *(2026-10-11)*
- [x] **T7 — Cliente: búsqueda, filtros y perfil público del técnico:** campos `especialidades` y `disponible` en `Tecnico`, módulo `src/modules/oficios` (catálogo de especialidades) y endpoints `GET /tecnicos` (búsqueda con filtros y paginación), `GET /tecnicos/:id` (perfil público) y `GET /oficios/:id/especialidades`. *(2026-10-11)*
- [x] **T8 — Solicitud de servicio y estados del servicio:** enums `EstadoServicio`/`RolActor`, modelos `Servicio`, `FotoServicio`, `HistorialServicio` y `Configuracion`, módulo `src/modules/servicios` con crear/listar/ver, aceptar/rechazar/completar/cancelar y expiración automática a las 24 h, y endpoint admin `GET /admin/cancelaciones-tardias`. *(2026-10-11)*
- [x] **T9 — Chat en tiempo real (Socket.IO) y acuerdo de precio/alcance:** modelos `Mensaje` y `Propuesta` y enum `EstadoPropuesta`, campos `montoAcordado`/`alcanceAcordado` en `Servicio`, módulo `src/modules/chat` (historial y envío REST), Socket.IO con autenticación JWT y salas por servicio, y endpoints de propuesta (`crear`/`aceptar`/`rechazar`). *(2026-10-11)*
- [x] **T10 — Reseñas (solo tras servicio completado) e historial:** modelo `Resena` y campos de reputación en `Tecnico` (`calificacionPromedio`, `totalResenas`, `serviciosCompletados`), módulo `src/modules/resenas` (crear reseña, listado público e historial por rol), recalculo de reputación en transacción, orden de búsqueda por calificación y ocultación de reseñas por el admin. *(2026-10-11)*
- [x] **T11 — Reportes de incidencias:** enums `TipoObjetivoReporte`/`CategoriaReporte`/`EstadoReporte` y modelo `Reporte`, módulo `src/modules/reportes` con creación ligada a un servicio (cliente→técnico, técnico→cliente, técnico→reseña), validación de categoría por objetivo, comentario obligatorio en `fraude`/`otro` y anti-duplicado, y endpoints admin para listar/filtrar, ver y resolver/descartar con nota. *(2026-10-11)*
- [x] **T12 — Favoritos y notificaciones:** modelo `Favorito` (cliente ↔ técnico, idempotente) y `Notificacion` + enum `TipoNotificacion`, módulos `src/modules/favoritos` (solo cliente) y `src/modules/notificaciones` (in-app + Socket.IO), sala personal `usuario:<id>`, y emisión en vivo en servicios, chat, reseñas, verificación del admin y reportes. *(2026-10-11)*
- [x] **T14 — Despliegue en Render:** seed `prisma/seed-clientes.js` (script `npm run seed:clientes`) que crea **solo admin + los 4 clientes de prueba**, sin técnicos ni Cloudinary; el `index.js` ya usa `cors()` (todos los orígenes) y `process.env.PORT`. La BD de Render arranca vacía y se sincroniza con `prisma migrate deploy`. *(2026-10-17)*
- [x] **T15 — Métricas y gráficos del panel admin:** módulo `src/modules/metricas/` con un único `GET /admin/metricas/dashboard` (rol `admin`) que devuelve tarjetas, prioridad del día, series semanales, distribuciones, reportes por motivo, cancelaciones tardías, tiempo de verificación y cola de revisión. Sin migración. *(2026-10-18)*

## Notas y decisiones
### T0
- **Versión de Prisma:** CLI `prisma@7.10.0` (coincide con `@prisma/client@7.10.0` y con AGENTS.md). Sin `postinstall` de la CLI 8-rc.
- **Prisma 7 no permite `url` en `schema.prisma`:** la URL vive en `prisma.config.ts` (`defineConfig({ datasource: { url: env("DATABASE_URL") } })`).
- **Runtime con driver adapter:** `src/config/prisma.js` usa `@prisma/adapter-pg` (`new PrismaClient({ adapter })`).
- **Generator:** clásico `prisma-client-js` (genera en `node_modules/@prisma/client`). El nuevo `prisma-client` emite ESM/TS y no encaja con CommonJS.
- **Estructura:** `src/{config,middlewares,modules/{auth,tecnicos,servicios,chat,resenas,reportes}}`; `docs/` con `PROGRESS.md`, `DECISIONES.md` y `ENDPOINTS_*.md`.
- **Endpoint de infraestructura:** `GET /` → `{ "data": { "servicio": "Trabajo Ya API", "estado": "funcionando" } }`.

### T1
- **Modelo de datos:** tabla única `Usuario` (email único → un email = un solo rol). `Tecnico` es 1:1 con `Usuario` (`usuarioId` único, `onDelete: Cascade`). Enums: `Rol { cliente, tecnico, admin }` y `EstadoVerificacion { pendiente, aprobado, observado, rechazado }`.
- **Registro y rol:** cada app tiene su endpoint y el rol lo fija el backend, nunca el body. `POST /auth/cliente/registro` → rol `cliente`. `POST /auth/tecnico/registro` → rol `tecnico` + perfil `Tecnico` con `estadoVerificacion: "pendiente"`. `admin` solo por seed/script manual.
- **Login por app:** `POST /auth/{cliente|tecnico|admin}/login`. El backend exige que el rol del usuario coincida con el de la app; si no, responde `401 Credenciales incorrectas` (mismo mensaje que contraseña mala, para no filtrar qué existe).
- **Contraseñas:** `bcrypt` (10 rondas), se guardan en `passwordHash`; nunca se devuelve. JWT firmado con `JWT_SECRET`, payload `{ sub, rol }`, expiración `7d`.
- **Validación:** Zod 4 en `src/middlewares/validate.js`; los controladores leen `req.validated.body`. Respuestas `{ data }` / `{ error }`; errores manejados en `src/middlewares/errorHandler.js` (`ApiError`).
- **Migración inicial:** el schema `public` de `mi_basedatos` traía escombro de un starter de Prisma (`Task` vacía + historial `20260714141918_init`). Con consentimiento explícito del usuario se hizo `prisma migrate reset` (Task tenía 0 filas) y se aplicó la migración propia `20261011025046_init`.
- **Carpetas de módulos vacíos:** se mantienen con `.gitkeep` hasta que se implementen (T4+).

### T2
- **Middlewares:** `src/middlewares/auth.js` con `autenticar` (lee `Authorization: Bearer <token>`, verifica el JWT y expone `req.usuario = { id, rol }`) y `autorizar(...roles)` (403 si el rol no está permitido). Se usan en cadena: primero `autenticar`, luego `autorizar`.
- **Datos propios:** los handlers identifican al usuario por `req.usuario.id` (del token), nunca por `params`/`body`, para que cada uno acceda solo a sus propios datos.
- **Endpoint protegido:** `GET /auth/perfil` (cualquier rol autenticado) devuelve el perfil del dueño del token.

### T4
- **Modelo:** enums `Oficio` (un solo oficio por técnico) y `Distrito` (11 distritos de la provincia de Trujillo). Campos nuevos en `Tecnico`: `oficio Oficio?`, `descripcion String?`, `aniosExperiencia Int?`, `distritos Distrito[]`, `disponibilidad Json?`. Migración `20261011031502_perfil_tecnico`.
- **Módulo:** `src/modules/tecnicos/` (routes, controller, service, schemas Zod). Montado como `/tecnicos`; todas sus rutas protegidas con `autenticar` + `autorizar("tecnico")`.
- **Endpoints:** `GET /tecnicos/perfil` (perfil propio, aunque esté sin completar) y `PUT /tecnicos/perfil` (completa/actualiza; el body reemplaza los campos enviados).
- **Perfil incompleto:** al registrarse, el perfil nace con `oficio`/`aniosExperiencia`/`disponibilidad` en `null` y `distritos: []`; se completa con `PUT`.
- **Validación (Zod):** oficio y distritos contra el catálogo; al menos un distrito; disponibilidad con al menos un día, horas `HH:MM`, `hasta > desde` y sin días repetidos; `aniosExperiencia` entero 0–70.
- **Identificadores ASCII:** `albanileria`, `victor_larco_herrera` (la app muestra la forma legible).
- **Incidente:** tras la migración el cliente Prisma quedó desactualizado (`Unknown field oficio`); se resolvió con `npx prisma generate` (anotado en `DECISIONES.md`).

### T5
- **Modelo:** nuevo modelo `DocumentoVerificacion` (1 técnico → N documentos) y enums `TipoDocumentoVerificacion { dni_frente, dni_reverso, selfie, cul, certificado_oficio }` y `EstadoDocumento { pendiente, aprobado, observado }`. `EstadoVerificacion` suma `en_revision`; `Tecnico` suma `documentosEnviadosAt` y relación `documentos`. Migración `20261011050754_documentos_verificacion`.
- **Almacenamiento privado:** `src/config/cloudinary.js` con `subirPrivado` (`resource_type: "auto"`, `type: "private"`, carpeta `trabajoya/tecnicos/<id>/verificacion`), `urlPrivada` (`private_download_url` firmada) y `eliminarArchivo`.
- **Subida:** `src/middlewares/upload.js` con Multer en memoria (campo `archivo`, 1 archivo, 5 MB); `LIMIT_FILE_SIZE` → `ApiError(400)`.
- **Endpoints (rol `tecnico`):** `GET /tecnicos/documentos`, `POST /tecnicos/documentos/:tipo`, `DELETE /tecnicos/documentos/:id`, `POST /tecnicos/verificacion/enviar`.
- **Reglas:** obligatorios `dni_frente`, `dni_reverso`, `selfie` (reemplazan el anterior); opcionales `cul`, `certificado_oficio` (se agregan). Formatos jpg/png/pdf, selfie solo jpg/png. Enviar exige los 3 obligatorios (si no, `400` con `detalles.faltantes`), pasa a `en_revision` + `documentosEnviadosAt`, reinicia documentos a `pendiente` y limpia `comentarioAdmin`. Mientras `en_revision` no se puede subir ni borrar.
- **`ApiError` con `detalles`** para devolver la lista de faltantes; `PERFIL_SELECT` ahora incluye `documentosEnviadosAt`.

### T6
- **Modelo:** `EstadoVerificacion` renombra `aprobado` → `verificado` y suma `suspendido`. Nuevo modelo `HistorialVerificacion` (técnico, admin, estado anterior/nuevo, comentario, fecha). Migración `20261011060000_admin_verificacion` (hecha a mano con `RENAME VALUE` y aplicada con `prisma migrate deploy`, porque `migrate dev` es interactivo).
- **Módulo:** `src/modules/admin/` (routes, controller, service, schemas Zod). Montado como `/admin`; todas sus rutas protegidas con `autenticar` + `autorizar("admin")`.
- **Endpoints:** `GET /admin/tecnicos` (filtro opcional `?estado=`), `GET /admin/tecnicos/:id`, `PATCH /admin/tecnicos/:id/documentos/:documentoId`, `POST /admin/tecnicos/:id/{aprobar,observar,rechazar,suspender,reactivar}`.
- **Reglas:** el admin solo aprueba/observa/rechaza desde `en_revision` (si no, `409`); al aprobar, todos los documentos quedan `aprobado`; observar permite que el técnico corrija y reenvíe; rechazar es definitivo (el técnico ya no puede reenviar). Suspender exige motivo y solo aplica a `verificado`; reactivar exige motivo y solo aplica a `suspendido`. Cada acción del admin genera un registro en el historial.
- **Cambio en T5:** `POST /tecnicos/verificacion/enviar` ahora solo se permite desde `pendiente`/`observado`; desde `verificado`/`suspendido`/`rechazado` responde `400` (rechazado es definitivo).
- **Seed de admin:** `prisma/seed-admin.js` + script `npm run seed:admin` (upsert por email con `rol: admin`; `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_NOMBRE`, por defecto `admin@trabajoya.com` / `123456`).

### T7
- **Modelo:** `Tecnico` suma `especialidades String[]` (default `[]`) y `disponible Boolean` (default `false`). Migración `20261011060902_perfil_publico` (aditiva).
- **Visibilidad:** la búsqueda y el perfil público solo muestran técnicos `estadoVerificacion = "verificado"` **y** con `oficio` definido (perfil completo). Nunca `pendiente`/`en_revision`/`observado`/`rechazado`/`suspendido`. Acceso solo con rol `cliente` (`GET /tecnicos` y `GET /tecnicos/:id`).
- **Datos públicos:** `id`, `nombre`, `oficio`, `aniosExperiencia`, `especialidades`, `distritos`, `disponible` y `verificado: true`; el detalle agrega `descripcion` y `disponibilidad` (horario semanal). Reservados para tareas futuras (siempre `null`/`0` por ahora): `calificacionPromedio` (T10), `totalResenas` (0) y `serviciosCompletados` (0). **Nunca** se exponen correo, teléfono, dirección, DNI, selfie, documentos ni historial de verificación.
- **Orden (default):** `disponible` desc → `aniosExperiencia` desc (nulls al final) → `id` asc. Sin parámetro de orden. Con T10 se antepondrá la calificación y los servicios completados al desempate.
- **Paginación:** `page` (default 1) y `limit` (default 20, tope 50; si piden más se recorta a 50). La respuesta incluye `paginacion { page, limit, total, total_paginas }`. Una página fuera de rango devuelve la lista vacía (no error).
- **Filtros:** `oficio` (enum), `distrito` (enum, coincide si está en la lista del técnico) y `nombre` (texto libre, `contains` case-insensitive sobre el nombre del usuario).
- **Especialidades:** campo nuevo, hasta 5 por técnico, cada una máx. 40 caracteres, sin duplicados; se normalizan con `trim`. Editables en `PUT /tecnicos/perfil` (junto a `disponible`). Catálogo sugerido por oficio en `GET /oficios/:id/especialidades` (el técnico puede escribir las suyas). No reemplazan al oficio ni se usan como filtro todavía.
- **Módulo `oficios`:** `src/modules/oficios/` con el catálogo `ESPECIALIDADES_POR_OFICIO` (5 sugerencias por oficio); endpoint `GET /oficios/:id/especialidades` con `autenticar` (cualquier rol); `:id` fuera del enum → 400.
- **Rutas:** `tecnicos.routes.js` reestructurado a auth por ruta (se quitó el `router.use` global) y `GET /:id` al final para no chocar con `/perfil` y `/documentos`.
- **Reservado T10/T8:** `calificacionPromedio`, `totalResenas` y `serviciosCompletados` se calcularán al implementar reseñas (T10) y servicios (T8); hoy son constantes.

### T8
- **Modelo:** enums `EstadoServicio { pendiente, aceptado, completado, rechazado, cancelado, expirado }` y `RolActor { cliente, tecnico, admin, sistema }`; modelos `Servicio` (solicitud), `FotoServicio`, `HistorialServicio` y `Configuracion`. `Usuario` suma `serviciosCliente`/`serviciosCancelados`/`serviciosCompletados`/`historialServicio`; `Tecnico` suma `servicios`. Migración `20261011063248_servicios`.
- **Módulo `src/modules/servicios`:** `POST /servicios` (cliente, multipart con hasta 3 fotos), `GET /servicios` (cliente ve las suyas, técnico las asignadas), `GET /servicios/:id` (participantes y admin), `POST /servicios/:id/{aceptar,rechazar,completar,cancelar}`. Montado en `/servicios` con `autenticar` global y `autorizar(...)` por ruta.
- **Reglas:** solo se puede solicitar a técnicos `verificado` + `disponible` (si no, `409`); máximo 1 pendiente por técnico y 3 pendientes en total (`409`); `fecha_hora` debe ser futura (`400`). El técnico ve la dirección recién cuando el servicio está `aceptado`; al cliente siempre. El cliente solo ve sus solicitudes y el técnico las suyas (si no, `404`).
- **Transiciones:** aceptar/rechazar solo desde `pendiente`; completar solo desde `aceptado` y si ya llegó la `fecha_hora` (`400` si no); cancelar cliente desde `pendiente`/`aceptado`, técnico solo desde `aceptado` (motivo obligatorio); cualquier otra → `409`. Cancelar desde `aceptado` con < 2 h para la hora → `cancelacionTardia = true`.
- **Expiración:** `expirarPendientes()` pasa a `expirado` las `pendiente` de más de 24 h y registra historial con `actorRol = sistema`; se ejecuta de forma perezosa al inicio de las operaciones del módulo.
- **Historial:** cada cambio de estado inserta en `HistorialServicio` (actor, estado anterior/nuevo, motivo, fecha) dentro de la misma transacción que el cambio.
- **Comisión:** valor leído de `Configuracion.comision_porcentaje` (fila `"0"` creada por `npm run seed:admin`); se guarda copiado en `Servicio.comisionPorcentaje`. No se calcula monto (sin precio ni alcance aún).
- **Admin:** `GET /admin/cancelaciones-tardias` lista usuarios con cancelaciones tardías de los últimos 30 días, agrupados y ordenados de mayor a menor (no se muestran al público).
- **Pendiente relacionado:** cuando exista el chat (T9) se acordarán **precio y alcance** del servicio (hoy no existen esos campos).

### T9
- **Modelo:** enum `EstadoPropuesta { pendiente, aceptada, rechazada }`; modelos `Mensaje` (servicio, autor, `autorRol`, contenido, fecha) y `Propuesta` (servicio, monto `Decimal(10,2)`, alcance, estado, quién creó/respondió, motivo de rechazo). `Servicio` suma `montoAcordado Decimal?`, `alcanceAcordado String?` y relaciones `mensajes`/`propuestas`; `Usuario` suma `mensajes`/`propuestasCreadas`/`propuestasRespondidas`. Migración `20261011064613_chat_propuestas` (aditiva).
- **Chat — alcance:** existe por **servicio**; se puede **escribir** mientras el servicio está `pendiente` o `aceptado` y queda **solo lectura** una vez final (`completado`/`cancelado`/`rechazado`/`expirado`). Solo **texto** (sin adjuntos). Participan únicamente el **cliente dueño** y el **técnico asignado**; el **admin no accede** a las conversaciones (es privado).
- **Chat — REST:** `GET /chat/servicios/:id/mensajes` (historial paginado, más recientes primero y devueltos en orden ascendente) y `POST /chat/servicios/:id/mensajes` (envía y, si hay Socket.IO activo, emite `mensaje:nuevo` a la sala). Ambos solo para `cliente`/`tecnico`; un no participante recibe `404` (no se revela que el servicio existe).
- **Chat — Socket.IO:** `src/config/socket.js` inicializa el servidor sobre el `http.Server` de Express. Autenticación en el handshake (`auth.token` → JWT); sin token o inválido, la conexión se rechaza. El cliente emite **`servicio:unirse`** (valida participación y lo une a la sala `servicio:<id>`) y **`mensaje:enviar`** `{ servicio_id, contenido }`; el servidor persiste y difunde **`mensaje:nuevo`** a la sala. Los errores vuelven por el callback y por los eventos `servicio:error`/`mensaje:error`. `index.js` ahora usa `http.createServer(app)` + `server.listen`.
- **Precio/alcance:** el **técnico propone** (`POST /servicios/:id/propuesta` con `monto` y `alcance`) y el **cliente acepta** (`.../propuesta/aceptar`) o **rechaza** (`.../propuesta/rechazar`, motivo opcional). Al aceptar se guardan `montoAcordado` y `alcanceAcordado` en el servicio; aceptar **no** cambia el estado del servicio. Solo hay **una propuesta pendiente** a la vez: si el técnico envía otra, la pendiente anterior queda `rechazada` con motivo "Reemplazada por una nueva propuesta". Se puede proponer solo en `pendiente`/`aceptado`. La comisión sigue siendo 0 y **no** se calcula monto de comisión todavía.
- **Dependencias:** `socket.io` (runtime) y `socket.io-client` (dev, solo para pruebas).

### T10
- **Modelo:** nuevo modelo `Resena` (`servicioId` único, `clienteId`, `tecnicoId`, `calificacion`, `comentario?`, `oculta` + `motivoOcultamiento`/`ocultadaPorId`/`ocultadaAt` para moderación; índice `[tecnicoId, oculta]`). `Tecnico` suma `calificacionPromedio Float?`, `totalResenas Int` (0), `serviciosCompletados Int` (0) y relación `resenas`; `Servicio` suma `resena Resena?`; `Usuario` suma `resenasCliente`/`resenasOcultadas`. Migración `20261011070122_resenas` (aditiva).
- **Módulo `src/modules/resenas`:** exporta tres routers montados en `index.js`: `/cliente` (`POST /servicios/:id/resena`, `GET /servicios/historial`), `/tecnico` (`GET /servicios/historial`) y `/tecnicos` (`GET /:id/resenas`). El endpoint de ocultar vive en el módulo admin (importa `recalcularReputacion` de `resenas.service`).
- **Reglas:** solo el **cliente dueño** reseña; solo servicios **`completado`** (`409` si no); **una reseña por servicio** (`409` si repite), no editable; `calificacion` entera 1–5 (obligatoria) y `comentario` ≤ 500 (opcional). El técnico no califica al cliente.
- **Reputación:** al crear la reseña se recalcula en la **misma transacción** `calificacionPromedio` (media de no ocultas, 2 decimales, `null` si no hay) y `totalResenas`. `serviciosCompletados` se incrementa al completar el servicio (en `servicios.completar`). Los tres valores alimentan el perfil público y la búsqueda.
- **Búsqueda:** nuevo orden `disponible` desc → `calificacionPromedio` desc (nulls al final) → `serviciosCompletados` desc → `aniosExperiencia` desc (nulls al final) → `id` asc. `GET /tecnicos` y `GET /tecnicos/:id` ya devuelven la reputación real (ya no `null`/`0` fijos).
- **Historial:** `GET /cliente/servicios/historial` y `GET /tecnico/servicios/historial` (paginados, `page` default 1, `limit` default 20 tope 50, más reciente primero; filtro opcional `estado`). Reutilizan `serializar` y `SERVICIO_SELECT` de `servicios.service` (misma regla de visibilidad de la dirección) y agregan `resena`.
- **Reseñas públicas:** `GET /tecnicos/:id/resenas` (solo `cliente`; el técnico debe estar `verificado` y con `oficio`, si no `404`); muestra calificación, comentario, fecha y el autor como **primer nombre + inicial del apellido** (`"Ana T."`).
- **Moderación:** `POST /admin/resenas/:id/ocultar` (motivo obligatorio) marca la reseña como oculta sin borrarla y recalcula la reputación sin las ocultas. Ocultar dos veces → `409`; ya oculta deja de aparecer en el listado público.

### T11
- **Modelo:** enums `TipoObjetivoReporte { tecnico, cliente, resena }`, `CategoriaReporte { no_se_presento, no_estaba, trabajo_deficiente, cobro_diferente, comportamiento_inapropiado, fraude, contenido_inapropiado, otro }` y `EstadoReporte { pendiente, resuelto, descartado }`; modelo `Reporte` (servicio, reportante + rol, objetivo polimórfico `objetivoUsuarioId`/`objetivoResenaId`, categoría, comentario, estado y resolución). `Usuario` suma `reportesCreados`/`reportesRecibidos`/`reportesResueltos`; `Servicio` suma `reportes`; `Resena` suma `reportes`. Migración `20261011182740_reportes` (aditiva).
- **Módulo `src/modules/reportes`:** exporta dos routers montados en `index.js`: `/reportes` (rol `cliente`/`tecnico`; `POST /reportes`) y `/admin` (rol `admin`; `GET /admin/reportes`, `GET /admin/reportes/:id`, `PATCH /admin/reportes/:id`). Convive con `adminRoutes` sin choques.
- **Reglas:** todo reporte se liga a un servicio en estado `aceptado`/`completado`/`cancelado` (`409` si no); el cliente reporta al técnico de un servicio suyo, el técnico reporta al cliente de un servicio suyo o una reseña suya (un cliente **no** reporta reseñas); un no participante → `404`. Categoría válida según el objetivo (`400` si no corresponde); comentario ≤ 500, obligatorio en `fraude`/`otro`. Anti-duplicado por `(reportante, servicio, tipoObjetivo)` → `409`.
- **Gestión del admin:** `GET /admin/reportes` con filtros `estado`, `tipo_objetivo`, `categoria` y paginación (`page` default 1, `limit` default 20 tope 50, más reciente primero). `PATCH /admin/reportes/:id` con `{ estado: "resuelto" | "descartado", nota }` (nota obligatoria) y solo desde `pendiente` (`409` si ya está cerrado). El reporte **no** sanciona solo; el admin sanciona con los endpoints existentes (suspender técnico, ocultar reseña).

### T12
- **Modelo:** modelo `Favorito` (`clienteId`, `tecnicoId`, `@@unique([clienteId, tecnicoId])`, cascadas); modelo `Notificacion` (`usuarioId`, `tipo TipoNotificacion`, `titulo`, `mensaje?`, `datos Json?` con referencias, `leida` default `false`, `leidaAt?`, `createdAt`) e índice `[usuarioId, leida]`/`[usuarioId, createdAt]`; enum `TipoNotificacion` con 16 valores. `Usuario` suma `favoritos`/`notificaciones`; `Tecnico` suma `favoritos`. Migración `20261011184212_favoritos_notificaciones` (aditiva).
- **Módulo `src/modules/favoritos`:** solo rol `cliente`. `POST /favoritos/:tecnicoId` (idempotente, `200`), `DELETE /favoritos/:tecnicoId` (idempotente, `204`, nunca `404`), `GET /favoritos` (paginado). Solo se puede marcar técnicos `verificado` con `oficio` (`404` si no). El listado filtra además a los que siguen vigentes y agrega `favoritoDesde`.
- **Módulo `src/modules/notificaciones`:** roles `cliente`/`tecnico`. `GET /notificaciones` (filtro `leida`, paginado, devuelve `noLeidas`), `GET /notificaciones/no-leidas`, `PATCH /notificaciones/:id/leer`, `PATCH /notificaciones/leer-todas`. Nacen no leídas; **no** se pueden borrar. Marcar una ajena → `404`; el admin no accede al módulo (`403`).
- **Emisión en vivo:** `socket.js` une cada socket conectado a la sala personal `usuario:<id>`; `notificaciones.service.crearYemitir(...)` crea la fila y emite `notificacion:nueva` a esa sala. Reutiliza `salaUsuario(usuarioId)` (nuevo export de `socket.js`). Requiere `socket.js` de forma perezosa (dentro de `emitir`) para no crear dependencia circular con `chat.service`.
- **Best-effort:** `crearYemitir` captura sus propios errores (loguea y devuelve `null`); el endpoint original nunca falla por una notificación. Se llama **después** de la transacción/estado principal, de modo que la notificación ya existe cuando responde la API.
- **Puntos de integración:** `servicios.service` (crear→`solicitud_nueva`, aceptar→`solicitud_aceptada`, rechazar→`solicitud_rechazada`, completar→`servicio_completado`, cancelar→`servicio_cancelado`, propuesta nueva/aceptada/rechazada), `chat.service` (mensaje→`mensaje_nuevo`), `resenas.service` (→`resena_recibida`), `admin.service` (verificación→según estado nuevo) y `reportes.service` (resolver/descartar→`reporte_resuelto`/`reporte_descartado`). En cada caso se notifica **a la otra parte** (nunca al actor).
- **Verificación:** mapa `estadoNuevo` → notificación (`verificado`→`verificacion_aprobada`, `observado`→`verificacion_observada`, `rechazado`→`verificacion_rechazada`, `suspendido`→`verificacion_suspendida`). **Reactivar** (`suspendido → verificado`) reutiliza `verificacion_aprobada`.
- **Montaje:** `index.js` añade `/favoritos` y `/notificaciones`.

### T14 — Despliegue en Render
- **Seed solo admin + clientes:** `prisma/seed-clientes.js` (script `npm run seed:clientes`). Crea el admin (`ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_NOMBRE`, por defecto `admin@trabajaya.com` / `341600`) y los 4 clientes del demo (`arom@gmail.com`, `carlos@gmail.com`, `alan@gmail.com`, `mauricio@gmail.com`, password `123456`), todos con `upsert` idempotente. No crea técnicos ni sube nada a Cloudinary. También asegura `Configuracion.comision_porcentaje = "0"`.
- **CORS y puerto:** `src/index.js` ya usa `app.use(cors())` (permite todos los orígenes) y `const PORT = process.env.PORT || 3000`. No se requirió cambio de código.
- **BD de Render:** está vacía (sin tablas) pero el repo **sí** tiene migraciones (`prisma/migrations/`), así que se sincroniza con `npx prisma migrate deploy` (no `db push`).
- **Build Command:** `npm ci && npx prisma generate && npx prisma migrate deploy`.
- **Start Command:** `npm start`.
- **Seed:** ejecutar `npm run seed:clientes` una sola vez contra la BD de Render tras el primer deploy.

### T15 — Métricas del panel admin
- **Módulo nuevo:** `src/modules/metricas/` (`metricas.routes.js`, `metricas.controller.js`, `metricas.service.js`, `metricas.schemas.js`). Montado en `/admin/metricas` **antes** de `adminRoutes` en `index.js` para no duplicar la autenticación.
- **Un solo endpoint:** `GET /admin/metricas/dashboard` (rol `admin`) devuelve todo el panel. Query opcional con topes: `semanas_registros` (12), `semanas_cancelaciones` (8), `dias_reportes` (30), `limit_cola` (5). Sin migración (no hay cambios de esquema).
- **Sin metas:** no se definieron meta semanal ni meta de 48 h, así que el payload no trae `meta`/`dentroDeMeta`; muestra valores absolutos y tendencias.
- **Tiempo de verificación:** solo técnicos **ya decididos**; se toma la primera fila de `HistorialVerificacion` con `estadoNuevo` ∈ `{verificado, observado, rechazado}` por técnico y se resta `Tecnico.createdAt`. Comparación 30 vs. 30 días previos.
- **Técnicos por oficio:** agrupado por el enum `Oficio` (no por el texto libre `especialidades`). **Cola de revisión:** `en_revision` con envío más antiguo primero, días esperando y documentos faltantes sobre los 5 tipos.
- **Semanas UTC** (lunes 00:00) y reparto en memoria sobre consultas acotadas por rango.

## Verificaciones realizadas (T1, T2, T4, T5, T6, T7, T8, T9, T10, T11, T12 y T15)
- `npx prisma migrate dev --name init` → migración `20261011025046_init` creada y aplicada; "your database is now in sync".
- Endpoints (servidor real en `localhost:3000`): `POST /auth/cliente/registro` → 201; `POST /auth/tecnico/registro` → 201 (crea perfil `pendiente`, comprobado en BD); login cliente y técnico → 200; credencial técnica en login de cliente → 401; email duplicado → 409; password corta → 400; email inválido → 400; `admin/login` sin admin → 401; ruta inexistente → 404.
- **T2** — `GET /auth/perfil`: sin token → 401; token inválido → 401; token válido (cliente y tecnico) → 200 con datos propios. Middleware `autorizar("admin")` en app de prueba: sin token → 401; token inválido → 401; rol cliente/tecnico → 403; rol admin → 200.
- **T4** — `GET /tecnicos/perfil` (técnico sin completar) → 200 con `null`/`[]`; `PUT /tecnicos/perfil` válido → 200 y se refleja en el `GET`; oficio inválido, sin distritos, horas invertidas y día repetido → 400; como `cliente` → 403; sin token → 401. `npx prisma migrate dev --name perfil_tecnico` → migración `20261011031502_perfil_tecnico` aplicada.
- **T5** — subida real a Cloudinary: `GET /tecnicos/documentos` vacío → 200 `[]`; subir `selfie`/`dni_frente`/`dni_reverso` (png) y `cul` (pdf) → 201; la URL privada firmada devuelta responde 200; `selfie` en pdf → 400; tipo inválido → 400; sin archivo → 400; reemplazar `dni_frente` deja 1 solo registro; archivo de 6 MB → 400; enviar → 200 `en_revision` + `documentosEnviadosAt`; subir/borrar estando `en_revision` → 400; reenviar → 400; enviar sin los 3 obligatorios → 400 con `detalles.faltantes`; borrar documento propio → 204 y desaparece del listado; borrar inexistente → 404; como `cliente` → 403; sin token → 401.
- Migración `20261011050754_documentos_verificacion` aplicada.
- Migración `20261011060000_admin_verificacion` aplicada (`RENAME VALUE`/`ADD VALUE` + `HistorialVerificacion`).
- **T6** — con admin sembrado (`npm run seed:admin`) y técnicos reales: `GET /admin/tecnicos?estado=en_revision` → 200 (encuentra al técnico); `GET /admin/tecnicos/:id` → 200 con documentos (URL firmada presente) e historial; `PATCH .../documentos/:documentoId` marcar `observado` → 200; `POST .../observar` → 200 `observado` (el técnico puede re-subir el documento observado y reenviar → 200 `en_revision`); `POST .../aprobar` → 200 `verificado` y todos los documentos `aprobado`, historial registrado; aprobar de nuevo → 409; `POST .../suspender` sin motivo → 400, con motivo → 200 `suspendido`; `POST .../reactivar` → 200 `verificado`, reactivar de nuevo → 409; `POST .../rechazar` → 200 `rechazado`; reenviar tras rechazo → 400; suspender un rechazado → 409; detalle inexistente → 404; `?estado=nope` → 400; como técnico → 403; sin token → 401.
- Datos de prueba creados durante las pruebas fueron eliminados (queda solo el admin sembrado; 0 técnicos, 0 documentos, 0 historial) y los archivos de prueba borrados de Cloudinary.
- Migración `20261011060902_perfil_publico` aplicada.
- **T7** — con 3 técnicos verificados (marcados `verificado` en BD como setup), 1 pendiente y 1 verificado sin oficio: `GET /tecnicos` → 200 solo con los 3 verificados y `oficio` definido, orden `disponible` desc → experiencia desc (10, 8, 5); filtros `oficio=electricidad`, `distrito=trujillo` y `nombre=...` → 200 correctos; paginación `limit=2` (página 1 → 2, página 2 → 1, página fuera de rango → `[]`) con `total`/`total_paginas`; `limit=100` → recortado a 50; `GET /tecnicos/:id` → 200 con las claves públicas exactas y sin datos de contacto, `calificacionPromedio:null`; perfil de no verificado, sin oficio e inexistente → 404; `PUT /tecnicos/perfil` con 6 especialidades, especialidad > 40, duplicada y `disponible` no booleano → 400; especialidades válidas se guardan con `trim` y se reflejan en `GET`; `GET /oficios/electricidad/especialidades` y `gasfiteria` → 200, oficio inválido → 400, sin token → 401; `GET /tecnicos` como técnico → 403, sin token → 401.
- Datos de prueba de T7 eliminados (queda solo el admin; 0 técnicos).
- Migración `20261011063248_servicios` aplicada.
- **T8** — con clientes y técnicos reales (verificados marcados en BD como setup) y el admin sembrado: crear solicitud válida (2 fotos) → 201 `pendiente`, `comisionPorcentaje: 0`, fotos con URL firmada, dirección visible al cliente; duplicado con el mismo técnico → 409; técnico no disponible → 409; técnico no verificado → 409; técnico inexistente → 404; fecha pasada → 400; descripción > 500 → 400; 4 fotos → 400 "hasta 3 archivos"; foto pdf → 400; listar como cliente/técnico → 200 (al técnico se le oculta la dirección en `pendiente`); otro cliente/técnico → 404; crear como técnico → 403; listar como admin → 403; sin token → 401; aceptar por no dueño → 404; aceptar → 200 `aceptado` (dirección visible al técnico); aceptar de nuevo → 409; completar antes de la fecha → 400; completar → 200 con `completadoPorRol`/`completadoAt`; completar/cancelar de nuevo → 409; rechazar sin motivo → 400, con motivo → 200 `rechazado` + `motivoRechazo`; cancelar pendiente (cliente) → 200; cancelar por técnico desde `pendiente` → 409; cancelar desde `aceptado` con 3 h → `cancelacionTardia: false`; con 1 h → `cancelacionTardia: true` (cliente y técnico); límite de 3 pendientes → 201,201,201 y cuarta → 409; expiración: una pendiente con `createdAt` de 25 h → `expirado` con historial `actorRol: sistema`; `GET /admin/cancelaciones-tardias` → 200 con los usuarios agrupados (cliente y técnico) y 403 como cliente.
- Datos de prueba de T8 eliminados (usuarios, servicios e imágenes de Cloudinary).
- Migración `20261011064613_chat_propuestas` aplicada.
- **T9** — con cliente, técnico verificado y un segundo cliente (setup por BD) y el admin sembrado: **propuesta** — cliente no puede proponer → 403; técnico propone → 201 con una propuesta `pendiente` y `montoAcordado: null`; técnico no puede aceptar → 403; cliente acepta → 200 con `montoAcordado`/`alcanceAcordado` guardados y la propuesta `aceptada`; aceptar sin pendiente → 404; nueva propuesta reemplaza la pendiente anterior (queda una sola `pendiente`); cliente rechaza → 200 con `motivoRechazo`; rechazar sin pendiente → 404; `monto` negativo → 400; `alcance` vacío → 400. **Chat REST** — cliente y técnico envían → 201; listar → 200 con 2 mensajes en orden ascendente y `paginacion.total: 2`; otro cliente → 404 (leer y enviar); sin token → 401; admin → 403; mensaje vacío y > 1000 → 400. **Socket.IO real** — cliente y técnico conectan; sin token no conecta; ambos se unen a la sala (`servicio:unirse` → `{ ok: true }`); otro cliente no se une (`error`); cliente envía y el técnico recibe `mensaje:nuevo`; mensaje vacío y servicio inexistente devuelven error. **Cierre** — cliente cancela el servicio → 200; enviar por REST y por socket tras cancelar → error (`409` / `mensaje:error`). Resultado: 45/45 comprobaciones correctas.
- Datos de prueba de T9 eliminados (quedan solo el admin y 0 técnicos/servicios/mensajes/propuestas).
- Migración `20261011070122_resenas` aplicada.
- **T10** — con cliente, segundo cliente, técnico verificado (setup por BD) y el admin sembrado: reseñar sin completar → `409`; calificación `0` y `6` → `400`; otro cliente → `404`; técnico en ruta de cliente → `403`. Crear reseña válida → `201`, técnico `calificacionPromedio: 5` y `totalResenas: 1`; repetir → `409`. `GET /tecnicos/:id/resenas` → `200` con autor `"Ana T."`; `GET /tecnicos/:id` y `GET /tecnicos?oficio=...` devuelven promedio `5`, total `1` y `serviciosCompletados: 1` (el completar incrementó el contador). Historial cliente/técnico → `200` con la reseña adjunta y la `direccion` correcta; filtro `estado=cancelado` → lista vacía; autorización cruzada → `403`; sin token → `401`; reseñas públicas sin rol cliente → `403`/`401`; técnico inexistente → `404`. Admin oculta → `200`, promedio `null` y total `0`, listado público `0`; ocultar de nuevo → `409`; inexistente → `404`; sin motivo → `400`; como cliente → `403`. Resultado: **46/46 comprobaciones correctas**.
- Datos de prueba de T10 eliminados (queda solo el admin; 0 técnicos/servicios/resenas/mensajes).
- Migración `20261011182740_reportes` aplicada.
- **T11** — con cliente, segundo cliente, dos técnicos verificados y los servicios/reseñas de prueba creados por BD (setup), y el admin sembrado: cliente reporta al técnico en `aceptado` → `201` (`estado: pendiente`, objetivo `tecnico`, reportante correcto); repetir el mismo → `409`; `fraude` sin comentario → `400`, con comentario → `201`; servicio `pendiente` → `409`; categoría `no_estaba` contra técnico → `400` y `no_se_presento` en `cancelado` → `201`; cliente intenta reportar reseña → `403`; técnico reporta al cliente → `201` (objetivo `cliente`); categoría de técnico contra cliente → `400`; técnico reporta su reseña → `201` (objetivo `resena`); reseña ajena → `404`; cliente no participante → `404`; categoría inexistente, `servicio_id`/`resena_id` faltantes y comentario > 500 → `400`; servicio inexistente → `404`; sin token → `401`, admin creando → `403`. Admin: listado con `reportante` y paginación correcta; filtros `estado=pendiente`, `tipo_objetivo=resena` y `categoria=fraude` → `200`; `limit=1` → `200`; `estado` inválido → `400`; detalle → `200`, inexistente → `404`; resolver sin nota → `400`, estado inválido → `400`, resolver → `200` (`estado: resuelto`, `notaResolucion`, `resueltoAt`, `resueltoPor`), resolver de nuevo → `409`, descartar otro → `200`, resolver inexistente → `404`; cliente en rutas admin → `403`, sin token → `401`. Resultado: **49/49 comprobaciones correctas**.
- Datos de prueba de T11 eliminados (queda solo el admin; 0 técnicos/servicios/resenas/reportes).
- Migración `20261011184212_favoritos_notificaciones` aplicada.
- **T12** — con cliente, segundo cliente, tres técnicos (dos verificados con oficio por BD) y el admin sembrado: **favoritos** — marcar → `200` con `favorito: true`; marcar repetido → `200` sin duplicar (1 fila en BD); listar → `200` con datos públicos (`verificado: true`, `oficio`); técnico en la ruta → `403`; quitar → `204`, repetido → `204`; restantes → `1`; técnico no verificado → `404`. **Notificaciones** — crear servicio → técnico recibe `solicitud_nueva`; aceptar → `solicitud_aceptada`; propuesta → `propuesta_nueva`; aceptar propuesta → `propuesta_aceptada`; mensaje de chat → `mensaje_nuevo`; completar → `servicio_completado`; reseña → `resena_recibida`; cancelar → `servicio_cancelado`; resolver reporte → `reporte_resuelto`; aprobar técnico → `verificacion_aprobada`; suspender → `verificacion_suspendida`. **Lectura/contador** — `noLeidas > 0`; marcar una → `200` y `leida: true`, el contador baja 1; `GET /notificaciones/no-leidas` → número; `PATCH /notificaciones/leer-todas` → `noLeidas: 0`; filtros `leida=true`/`false` correctos. **Acceso** — otro usuario marca ajena → `404`; admin en `/notificaciones` → `403`. **Socket.IO real** — un cliente emite y el técnico conectado (sala `usuario:<id>`) recibe `notificacion:nueva` con `tipo: solicitud_nueva` en vivo. Resultado: **42/42 comprobaciones correctas**.
- Datos de prueba de T12 eliminados (queda solo el admin; 0 técnicos/servicios/favoritos/notificaciones).
- **T15** — servidor real (`localhost:3000`) con la BD local: sin token → `401`; query inválida (`?dias_reportes=999`) y no numérica (`?limit_cola=abc`) → `400 Datos inválidos`; con token admin y data demo (16 técnicos, 14 reportes) → `200` con todos los bloques correctos: `tecnicosPorEstado` (15 `en_revision`, 1 `verificado`, suma 16), `tecnicosPorOficio` (pintura 5, electricidad 4, carpintería 3, gasfitería 2, albañilería 2; porcentajes suman 100), `reportesPorMotivo` (14 repartidos por categoría), `registrosVerificaciones` (12 semanas, 16 registros y 1 verificado en la semana en curso), `cancelacionesTardiasSemanales` (8 semanas, pico 6), `colaRevision` (5 más antiguos, `faltantes: [cul, certificado_oficio]`) y `tiempoVerificacion` (`promedioHoras: 0` por datos del seed).

## Pendiente del equipo (datos que debe dar el humano)
- [x] URL de la base de datos PostgreSQL *(`DATABASE_URL` en `.env`)*
- [x] Secreto JWT *(`JWT_SECRET` en `.env`)*
- [ ] Google OAuth: Client ID y Client Secret — **postergado, fuera del MVP** *(se pedirán cuando se haga T3)*
- [x] Cloudinary: cloud name, API key y API secret *(T5: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)* — **rotar credenciales** (se compartieron por chat).
- [ ] Admin: definir email y contraseña reales (el seed `npm run seed:admin` usa `admin@trabajoya.com` / `123456` por defecto; **cambiar en producción**).
- [x] Reglas de negocio: estados del servicio y comisión
- [x] **Precio y alcance del servicio:** resuelto en T9 (el técnico propone y el cliente acepta; se guardan `montoAcordado`/`alcanceAcordado`). La comisión sigue en 0 y todavía no se calcula monto de comisión.
