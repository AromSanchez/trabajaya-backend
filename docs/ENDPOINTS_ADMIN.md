# Endpoints — Web de administración

> El rol `admin` no se crea por registro público. Se crea con un seed o script manual.

### POST /auth/admin/login
Auth: no
Body:
{ "email": "admin@trabajoya.com", "password": "123456" }
Respuesta 200:
{ "data": { "token": "eyJhbGci...", "usuario": { "id": 3, "email": "admin@trabajoya.com", "nombre": "Administrador", "rol": "admin" } } }
Errores: 400 datos inválidos · 401 credenciales incorrectas (incluye cuando la cuenta no es de rol `admin`)
Estado: listo

### GET /auth/perfil
Devuelve los datos del usuario autenticado (el dueño del token). Sirve para cualquier rol.
Auth: sí — `Authorization: Bearer <token>`
Respuesta 200:
{ "data": { "usuario": { "id": 3, "email": "admin@trabajoya.com", "nombre": "Administrador", "rol": "admin" } } }
Errores: 401 no autenticado · 401 token inválido o expirado
Estado: listo

### GET /admin/tecnicos
Lista los técnicos, opcionalmente filtrados por estado de verificación. Todos los endpoints de esta sección requieren rol `admin`.
Auth: sí — `Authorization: Bearer <token>` (rol `admin`)
Query: `estado` (opcional) ∈ `pendiente` | `en_revision` | `verificado` | `observado` | `rechazado` | `suspendido`
Ejemplo: `GET /admin/tecnicos?estado=en_revision`
Respuesta 200:
{ "data": { "tecnicos": [ { "id": 8, "estadoVerificacion": "en_revision", "oficio": "electricidad", "descripcion": null, "aniosExperiencia": 8, "distritos": ["trujillo"], "disponibilidad": [ { "dia": "lunes", "desde": "08:00", "hasta": "18:00" } ], "documentosEnviadosAt": "2026-10-11T05:29:38.087Z", "createdAt": "2026-10-11T05:29:36.131Z", "usuario": { "id": 16, "email": "mario@mail.com", "nombre": "Mario Gómez" } } ] } }
Errores: 400 estado inválido · 401 no autenticado / token inválido · 403 no eres admin
Estado: listo

### GET /admin/tecnicos/:id
Devuelve el detalle de un técnico: perfil, documentos (con URL privada firmada) e historial de cambios de estado.
Auth: sí — `Authorization: Bearer <token>` (rol `admin`)
Respuesta 200:
{ "data": { "tecnico": { "id": 8, "estadoVerificacion": "en_revision", "oficio": "electricidad", "descripcion": null, "aniosExperiencia": 8, "distritos": ["trujillo"], "disponibilidad": [ { "dia": "lunes", "desde": "08:00", "hasta": "18:00" } ], "documentosEnviadosAt": "2026-10-11T05:29:38.087Z", "usuario": { "id": 16, "email": "mario@mail.com", "nombre": "Mario Gómez" }, "documentos": [ { "id": 12, "tipo": "selfie", "formato": "png", "nombreOriginal": "selfie.png", "bytes": 204800, "estado": "pendiente", "comentarioAdmin": null, "url": "https://api.cloudinary.com/v1_1/<cloud>/image/download?timestamp=...&public_id=...&signature=...", "createdAt": "2026-10-11T05:29:38.062Z", "updatedAt": "2026-10-11T05:29:38.062Z" } ], "historial": [ { "id": 1, "estadoAnterior": "en_revision", "estadoNuevo": "observado", "comentario": "Corrige la selfie", "createdAt": "2026-10-11T05:29:38.500Z", "admin": { "id": 15, "nombre": "Administrador", "email": "admin@trabajoya.com" } } ] } } }
Errores: 401 no autenticado / token inválido · 403 no eres admin · 404 técnico no encontrado
Estado: listo

### PATCH /admin/tecnicos/:id/documentos/:documentoId
Marca un documento del técnico como `aprobado` u `observado` (con comentario opcional). Solo cuando el técnico está `en_revision`.
Auth: sí — `Authorization: Bearer <token>` (rol `admin`)
Body:
{ "estado": "observado", "comentario": "La selfie no se ve bien" }
Respuesta 200:
{ "data": { "documento": { "id": 12, "tipo": "selfie", "formato": "png", "nombreOriginal": "c.png", "bytes": 204800, "estado": "observado", "comentarioAdmin": "La selfie no se ve bien", "url": "https://api.cloudinary.com/v1_1/<cloud>/image/download?timestamp=...&public_id=...&signature=...", "createdAt": "2026-10-11T05:29:38.062Z", "updatedAt": "2026-10-11T05:29:40.000Z" } } }
Errores: 400 datos inválidos · 401 no autenticado / token inválido · 403 no eres admin · 404 técnico o documento no encontrado · 409 el técnico no está en revisión
Estado: listo

### POST /admin/tecnicos/:id/aprobar
Aprueba al técnico: pasa a `verificado` y todos sus documentos quedan `aprobado`. Solo desde `en_revision`.
Auth: sí — `Authorization: Bearer <token>` (rol `admin`)
Body (opcional):
{ "comentario": "Todo ok" }
Respuesta 200:
{ "data": { "tecnico": { "id": 8, "estadoVerificacion": "verificado", "oficio": "electricidad", "usuario": { "id": 16, "email": "mario@mail.com", "nombre": "Mario Gómez" } } } }
Errores: 400 datos inválidos · 401 no autenticado / token inválido · 403 no eres admin · 404 técnico no encontrado · 409 el técnico no está en revisión
Estado: listo

### POST /admin/tecnicos/:id/observar
Observa al técnico: pasa a `observado` para que corrija los documentos observados y reenvíe. Solo desde `en_revision`.
Auth: sí — `Authorization: Bearer <token>` (rol `admin`)
Body (opcional):
{ "comentario": "Corrige la selfie" }
Respuesta 200:
{ "data": { "tecnico": { "id": 8, "estadoVerificacion": "observado", "usuario": { "id": 16, "email": "mario@mail.com", "nombre": "Mario Gómez" } } } }
Errores: 400 datos inválidos · 401 no autenticado / token inválido · 403 no eres admin · 404 técnico no encontrado · 409 el técnico no está en revisión
Estado: listo

### POST /admin/tecnicos/:id/rechazar
Rechaza al técnico (definitivo): pasa a `rechazado` y no podrá volver a enviar a revisión. Solo desde `en_revision`.
Auth: sí — `Authorization: Bearer <token>` (rol `admin`)
Body (opcional):
{ "comentario": "Documentos falsos" }
Respuesta 200:
{ "data": { "tecnico": { "id": 9, "estadoVerificacion": "rechazado", "usuario": { "id": 17, "email": "luis@mail.com", "nombre": "Luis Pérez" } } } }
Errores: 400 datos inválidos · 401 no autenticado / token inválido · 403 no eres admin · 404 técnico no encontrado · 409 el técnico no está en revisión
Estado: listo

### POST /admin/tecnicos/:id/suspender
Suspende a un técnico `verificado` (por reportes o incidencias). El motivo es obligatorio.
Auth: sí — `Authorization: Bearer <token>` (rol `admin`)
Body:
{ "motivo": "Reportes graves de clientes" }
Respuesta 200:
{ "data": { "tecnico": { "id": 8, "estadoVerificacion": "suspendido", "usuario": { "id": 16, "email": "mario@mail.com", "nombre": "Mario Gómez" } } } }
Errores: 400 datos inválidos (motivo obligatorio) · 401 no autenticado / token inválido · 403 no eres admin · 404 técnico no encontrado · 409 el técnico no está verificado
Estado: listo

### POST /admin/tecnicos/:id/reactivar
Reactiva a un técnico `suspendido`: vuelve a `verificado`. El motivo es obligatorio.
Auth: sí — `Authorization: Bearer <token>` (rol `admin`)
Body:
{ "motivo": "Caso aclarado" }
Respuesta 200:
{ "data": { "tecnico": { "id": 8, "estadoVerificacion": "verificado", "usuario": { "id": 16, "email": "mario@mail.com", "nombre": "Mario Gómez" } } } }
Errores: 400 datos inválidos (motivo obligatorio) · 401 no autenticado / token inválido · 403 no eres admin · 404 técnico no encontrado · 409 el técnico no está suspendido
Estado: listo

### GET /admin/cancelaciones-tardias
Lista los usuarios (clientes y técnicos) con cancelaciones tardías en los últimos 30 días, agrupados por usuario y ordenados de mayor a menor. No hay sanciones automáticas: el admin revisa y decide. No se muestran al público.
Auth: sí — `Authorization: Bearer <token>` (rol `admin`)
Respuesta 200:
{ "data": { "usuarios": [ { "usuarioId": 25, "rol": "cliente", "nombre": "Ana Pérez", "email": "ana@mail.com", "cancelacionesTardias": 2 }, { "usuarioId": 28, "rol": "tecnico", "nombre": "Mario Gómez", "email": "mario@mail.com", "cancelacionesTardias": 1 } ] } }
Errores: 401 no autenticado / token inválido · 403 no eres admin
Estado: listo

Nota (sin endpoint propio): el admin puede ver el detalle de un servicio con `GET /servicios/:id` (incluye `montoAcordado`, `alcanceAcordado` y `propuestas`), pero **no** tiene acceso a las conversaciones del chat (`GET/POST /chat/servicios/:id/mensajes` responden `403` para el rol `admin`); el chat es privado entre cliente y técnico.
