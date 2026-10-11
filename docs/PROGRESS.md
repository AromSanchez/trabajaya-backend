# PROGRESS — Memoria del backend de Trabajo Ya

> El agente lee este archivo al empezar y lo actualiza al terminar cada tarea.
> Las decisiones de negocio y de arquitectura se registran en `docs/DECISIONES.md`.
> Solo una tarea puede estar "En curso" a la vez.

## En curso
- **T3 — Login con Google OAuth.** *(BLOQUEADA: faltan `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`; pedirlos al humano.)*

> **Tarea siguiente:** T4 — Perfil del técnico (oficio, experiencia, zona, disponibilidad).

## Pendientes (en orden)
- [ ] T4 — Perfil del técnico (oficio, experiencia, zona, disponibilidad)
- [ ] T5 — Subida de documentos de verificación (Cloudinary)
- [ ] T6 — Admin: revisar, aprobar, observar o rechazar técnicos
- [ ] T7 — Cliente: búsqueda, filtros y perfil público del técnico
- [ ] T8 — Solicitud de servicio y estados del servicio
- [ ] T9 — Chat en tiempo real (Socket.IO)
- [ ] T10 — Reseñas (solo tras servicio completado) e historial
- [ ] T11 — Reportes de incidencias
- [ ] T12 — Favoritos y notificaciones
- [ ] T13 — Datos de prueba

## Hechas
- [x] **T0 — Configuración inicial:** proyecto Express, Prisma 7, conexión a PostgreSQL, estructura de carpetas, `.env.example`, `.gitignore`. *(2026-10-10)*
- [x] **T1 — Registro y login con email y contraseña (JWT + bcrypt):** modelos `Usuario` y `Tecnico`, migración inicial, módulo `src/modules/auth` y endpoints por app. *(2026-10-11)*
- [x] **T2 — Roles y middleware de permisos:** `src/middlewares/auth.js` con `autenticar` (verifica JWT → `req.usuario = { id, rol }`) y `autorizar(...roles)` (403 si el rol no está permitido); endpoint protegido `GET /auth/perfil`. *(2026-10-11)*

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

## Verificaciones realizadas (T1 y T2)
- `npx prisma migrate dev --name init` → migración `20261011025046_init` creada y aplicada; "your database is now in sync".
- Endpoints (servidor real en `localhost:3000`): `POST /auth/cliente/registro` → 201; `POST /auth/tecnico/registro` → 201 (crea perfil `pendiente`, comprobado en BD); login cliente y técnico → 200; credencial técnica en login de cliente → 401; email duplicado → 409; password corta → 400; email inválido → 400; `admin/login` sin admin → 401; ruta inexistente → 404.
- **T2** — `GET /auth/perfil`: sin token → 401; token inválido → 401; token válido (cliente y tecnico) → 200 con datos propios. Middleware `autorizar("admin")` en app de prueba: sin token → 401; token inválido → 401; rol cliente/tecnico → 403; rol admin → 200.
- Datos de prueba creados durante las pruebas fueron eliminados (0 usuarios, 0 técnicos restantes).

## Pendiente del equipo (datos que debe dar el humano)
- [x] URL de la base de datos PostgreSQL *(`DATABASE_URL` en `.env`)*
- [x] Secreto JWT *(`JWT_SECRET` en `.env`)*
- [ ] Google OAuth: Client ID y Client Secret *(T3: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)*
- [ ] Cloudinary: cloud name, API key y API secret *(T5: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)*
- [ ] Reglas de negocio: estados del servicio, verificación y comisión
