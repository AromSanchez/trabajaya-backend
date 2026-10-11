# PROGRESS — Memoria del backend de Trabajo Ya

> El agente lee este archivo al empezar y lo actualiza al terminar cada tarea.
> Las decisiones de negocio y de arquitectura se registran en `docs/DECISIONES.md`.
> Solo una tarea puede estar "En curso" a la vez.

## En curso
- **T7 — Cliente: búsqueda, filtros y perfil público del técnico.**

> **Tarea siguiente:** T8 — Solicitud de servicio y estados del servicio.

## Pendientes (en orden)
- [ ] T8 — Solicitud de servicio y estados del servicio
- [ ] T9 — Chat en tiempo real (Socket.IO)
- [ ] T10 — Reseñas (solo tras servicio completado) e historial
- [ ] T11 — Reportes de incidencias
- [ ] T12 — Favoritos y notificaciones
- [ ] T13 — Datos de prueba

## Postergadas (fuera del MVP por ahora)
- [ ] T3 — Login con Google OAuth *(se hará más adelante; no es parte del MVP)*

## Hechas
- [x] **T0 — Configuración inicial:** proyecto Express, Prisma 7, conexión a PostgreSQL, estructura de carpetas, `.env.example`, `.gitignore`. *(2026-10-10)*
- [x] **T1 — Registro y login con email y contraseña (JWT + bcrypt):** modelos `Usuario` y `Tecnico`, migración inicial, módulo `src/modules/auth` y endpoints por app. *(2026-10-11)*
- [x] **T2 — Roles y middleware de permisos:** `src/middlewares/auth.js` con `autenticar` (verifica JWT → `req.usuario = { id, rol }`) y `autorizar(...roles)` (403 si el rol no está permitido); endpoint protegido `GET /auth/perfil`. *(2026-10-11)*
- [x] **T4 — Perfil del técnico:** enums `Oficio` y `Distrito`, campos de perfil en `Tecnico`, módulo `src/modules/tecnicos` y endpoints `GET`/`PUT /tecnicos/perfil`. *(2026-10-11)*
- [x] **T5 — Subida de documentos de verificación (Cloudinary):** enums `TipoDocumentoVerificacion`/`EstadoDocumento`, modelo `DocumentoVerificacion`, estados de revisión, Multer (memoria, 5 MB) y endpoints `GET`/`POST`/`DELETE /tecnicos/documentos` y `POST /tecnicos/verificacion/enviar`. *(2026-10-11)*
- [x] **T6 — Admin: revisar, aprobar, observar o rechazar técnicos:** enum `verificado` (ex `aprobado`) y `suspendido`, modelo `HistorialVerificacion`, módulo `src/modules/admin` con listado/detalle, marcado de documentos, aprobar/observar/rechazar y suspender/reactivar, y seed de admin. *(2026-10-11)*

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

## Verificaciones realizadas (T1, T2, T4, T5 y T6)
- `npx prisma migrate dev --name init` → migración `20261011025046_init` creada y aplicada; "your database is now in sync".
- Endpoints (servidor real en `localhost:3000`): `POST /auth/cliente/registro` → 201; `POST /auth/tecnico/registro` → 201 (crea perfil `pendiente`, comprobado en BD); login cliente y técnico → 200; credencial técnica en login de cliente → 401; email duplicado → 409; password corta → 400; email inválido → 400; `admin/login` sin admin → 401; ruta inexistente → 404.
- **T2** — `GET /auth/perfil`: sin token → 401; token inválido → 401; token válido (cliente y tecnico) → 200 con datos propios. Middleware `autorizar("admin")` en app de prueba: sin token → 401; token inválido → 401; rol cliente/tecnico → 403; rol admin → 200.
- **T4** — `GET /tecnicos/perfil` (técnico sin completar) → 200 con `null`/`[]`; `PUT /tecnicos/perfil` válido → 200 y se refleja en el `GET`; oficio inválido, sin distritos, horas invertidas y día repetido → 400; como `cliente` → 403; sin token → 401. `npx prisma migrate dev --name perfil_tecnico` → migración `20261011031502_perfil_tecnico` aplicada.
- **T5** — subida real a Cloudinary: `GET /tecnicos/documentos` vacío → 200 `[]`; subir `selfie`/`dni_frente`/`dni_reverso` (png) y `cul` (pdf) → 201; la URL privada firmada devuelta responde 200; `selfie` en pdf → 400; tipo inválido → 400; sin archivo → 400; reemplazar `dni_frente` deja 1 solo registro; archivo de 6 MB → 400; enviar → 200 `en_revision` + `documentosEnviadosAt`; subir/borrar estando `en_revision` → 400; reenviar → 400; enviar sin los 3 obligatorios → 400 con `detalles.faltantes`; borrar documento propio → 204 y desaparece del listado; borrar inexistente → 404; como `cliente` → 403; sin token → 401.
- Migración `20261011050754_documentos_verificacion` aplicada.
- Migración `20261011060000_admin_verificacion` aplicada (`RENAME VALUE`/`ADD VALUE` + `HistorialVerificacion`).
- **T6** — con admin sembrado (`npm run seed:admin`) y técnicos reales: `GET /admin/tecnicos?estado=en_revision` → 200 (encuentra al técnico); `GET /admin/tecnicos/:id` → 200 con documentos (URL firmada presente) e historial; `PATCH .../documentos/:documentoId` marcar `observado` → 200; `POST .../observar` → 200 `observado` (el técnico puede re-subir el documento observado y reenviar → 200 `en_revision`); `POST .../aprobar` → 200 `verificado` y todos los documentos `aprobado`, historial registrado; aprobar de nuevo → 409; `POST .../suspender` sin motivo → 400, con motivo → 200 `suspendido`; `POST .../reactivar` → 200 `verificado`, reactivar de nuevo → 409; `POST .../rechazar` → 200 `rechazado`; reenviar tras rechazo → 400; suspender un rechazado → 409; detalle inexistente → 404; `?estado=nope` → 400; como técnico → 403; sin token → 401.
- Datos de prueba creados durante las pruebas fueron eliminados (queda solo el admin sembrado; 0 técnicos, 0 documentos, 0 historial) y los archivos de prueba borrados de Cloudinary.

## Pendiente del equipo (datos que debe dar el humano)
- [x] URL de la base de datos PostgreSQL *(`DATABASE_URL` en `.env`)*
- [x] Secreto JWT *(`JWT_SECRET` en `.env`)*
- [ ] Google OAuth: Client ID y Client Secret — **postergado, fuera del MVP** *(se pedirán cuando se haga T3)*
- [x] Cloudinary: cloud name, API key y API secret *(T5: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)* — **rotar credenciales** (se compartieron por chat).
- [ ] Admin: definir email y contraseña reales (el seed `npm run seed:admin` usa `admin@trabajoya.com` / `123456` por defecto; **cambiar en producción**).
- [ ] Reglas de negocio: estados del servicio y comisión
