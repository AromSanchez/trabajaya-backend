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
- **Estados de verificación:** `pendiente`, `aprobado`, `observado`, `rechazado`.
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
- **Mensajes de error en español**, sin detalles internos.
- **Estructura de módulos:** cada módulo tiene rutas, controlador, servicio y esquemas Zod (`src/modules/<modulo>/`); middlewares en `src/middlewares/` y config en `src/config/`.
- **Memoria del proyecto en `docs/`:** `PROGRESS.md` (tareas), `DECISIONES.md` (este archivo) y `ENDPOINTS_{CLIENTE,TECNICO,ADMIN}.md` (endpoints con formato fijo).
