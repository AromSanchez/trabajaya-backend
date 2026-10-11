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

### POST /admin/resenas/:id/ocultar
Oculta una reseña **sin borrarla** (moderación por reportes). El motivo es obligatorio. Al ocultarla, el promedio y el número de reseñas del técnico se recalculan sin contar las ocultas, y la reseña deja de aparecer en `GET /tecnicos/:id/resenas`.
Auth: sí — `Authorization: Bearer <token>` (rol `admin`)
Body:
{ "motivo": "Contenido inapropiado" }
Respuesta 200:
{ "data": { "resena": { "id": 1, "servicioId": 1, "calificacion": 1, "comentario": "Comentario ofensivo", "oculta": true, "motivoOcultamiento": "Contenido inapropiado", "ocultadaAt": "2026-10-11T09:00:00.000Z" } } }
Errores: 400 datos inválidos (motivo obligatorio) · 401 no autenticado / token inválido · 403 no eres admin · 404 reseña no encontrada · 409 la reseña ya está oculta
Nota: ocultar no elimina la reseña; queda registrada con quién la ocultó (`ocultadaPorId`), cuándo (`ocultadaAt`) y por qué (`motivoOcultamiento`). El técnico puede reportar una reseña que recibió y el admin verla en `GET /admin/reportes`.
Estado: listo

### GET /admin/reportes
Lista los reportes de incidencias creados por clientes y técnicos. Filtros y paginación opcionales.
Auth: sí — `Authorization: Bearer <token>` (rol `admin`)
Query (opcional): `estado` ∈ `pendiente` | `resuelto` | `descartado` · `tipo_objetivo` ∈ `tecnico` | `cliente` | `resena` · `categoria` ∈ `no_se_presento` | `no_estaba` | `trabajo_deficiente` | `cobro_diferente` | `comportamiento_inapropiado` | `fraude` | `contenido_inapropiado` | `otro` · `page` (default 1) · `limit` (default 20, tope 50)
Respuesta 200:
{ "data": { "reportes": [ { "id": 1, "tipoObjetivo": "tecnico", "categoria": "trabajo_deficiente", "comentario": "El trabajo quedó incompleto", "estado": "pendiente", "reportante": { "id": 1, "nombre": "Ana Pérez", "rol": "cliente" }, "objetivo": { "tipo": "tecnico", "id": 10, "nombre": "Luis Ramos", "rol": "tecnico" }, "servicio": { "id": 1, "estado": "aceptado" }, "notaResolucion": null, "resueltoPor": null, "resueltoAt": null, "createdAt": "2026-10-11T09:00:00.000Z", "updatedAt": "2026-10-11T09:00:00.000Z" } ], "paginacion": { "page": 1, "limit": 20, "total": 1, "total_paginas": 1 } } }
Errores: 400 filtros o paginación inválidos · 401 no autenticado / token inválido · 403 no eres admin
Notas: orden del más reciente al más antiguo. Cuando el objetivo es una reseña, `objetivo` es `{ "tipo": "resena", "id": 1, "calificacion": 1, "comentario": "..." }`. El admin **no** puede crear reportes.
Estado: listo

### GET /admin/reportes/:id
Detalle de un reporte.
Auth: sí — `Authorization: Bearer <token>` (rol `admin`)
Respuesta 200:
{ "data": { "reporte": { "id": 1, "tipoObjetivo": "tecnico", "categoria": "trabajo_deficiente", "comentario": "El trabajo quedó incompleto", "estado": "resuelto", "reportante": { "id": 1, "nombre": "Ana Pérez", "rol": "cliente" }, "objetivo": { "tipo": "tecnico", "id": 10, "nombre": "Luis Ramos", "rol": "tecnico" }, "servicio": { "id": 1, "estado": "aceptado" }, "notaResolucion": "Se suspendió al técnico", "resueltoPor": { "id": 5, "nombre": "Admin" }, "resueltoAt": "2026-10-11T10:00:00.000Z", "createdAt": "2026-10-11T09:00:00.000Z", "updatedAt": "2026-10-11T10:00:00.000Z" } } }
Errores: 400 id inválido · 401 no autenticado / token inválido · 403 no eres admin · 404 reporte no encontrado
Estado: listo

### PATCH /admin/reportes/:id
Marca un reporte como **resuelto** o **descartado** con una nota obligatoria. Solo se puede cerrar un reporte `pendiente`. Este endpoint **no** aplica sanciones: el admin suspende al técnico u oculta la reseña por separado.
Auth: sí — `Authorization: Bearer <token>` (rol `admin`)
Body:
{ "estado": "resuelto", "nota": "Se suspendió al técnico por incumplimiento" }
- `estado`: `resuelto` o `descartado` (obligatorio).
- `nota`: 1–500 caracteres (obligatoria).
Respuesta 200:
{ "data": { "reporte": { "id": 1, "tipoObjetivo": "tecnico", "categoria": "trabajo_deficiente", "comentario": "El trabajo quedó incompleto", "estado": "resuelto", "reportante": { "id": 1, "nombre": "Ana Pérez", "rol": "cliente" }, "objetivo": { "tipo": "tecnico", "id": 10, "nombre": "Luis Ramos", "rol": "tecnico" }, "servicio": { "id": 1, "estado": "aceptado" }, "notaResolucion": "Se suspendió al técnico por incumplimiento", "resueltoPor": { "id": 5, "nombre": "Admin" }, "resueltoAt": "2026-10-11T10:00:00.000Z", "createdAt": "2026-10-11T09:00:00.000Z", "updatedAt": "2026-10-11T10:00:00.000Z" } } }
Errores: 400 estado o nota inválidos · 401 no autenticado / token inválido · 403 no eres admin · 404 reporte no encontrado · 409 el reporte ya fue resuelto o descartado
Estado: listo

Nota (sin endpoint propio): el admin puede ver el detalle de un servicio con `GET /servicios/:id` (incluye `montoAcordado`, `alcanceAcordado` y `propuestas`), pero **no** tiene acceso a las conversaciones del chat (`GET/POST /chat/servicios/:id/mensajes` responden `403` para el rol `admin`); el chat es privado entre cliente y técnico.
