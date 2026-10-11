# Endpoints — App del técnico

### POST /auth/tecnico/registro
Crea el usuario con rol `tecnico` y su perfil de técnico con `estadoVerificacion: "pendiente"`.
Auth: no
Body:
{ "email": "mario@mail.com", "password": "123456", "nombre": "Mario Gómez" }
Respuesta 201:
{ "data": { "token": "eyJhbGci...", "usuario": { "id": 2, "email": "mario@mail.com", "nombre": "Mario Gómez", "rol": "tecnico" } } }
Errores: 400 datos inválidos · 409 el correo ya está registrado
Estado: listo

### POST /auth/tecnico/login
Auth: no
Body:
{ "email": "mario@mail.com", "password": "123456" }
Respuesta 200:
{ "data": { "token": "eyJhbGci...", "usuario": { "id": 2, "email": "mario@mail.com", "nombre": "Mario Gómez", "rol": "tecnico" } } }
Errores: 400 datos inválidos · 401 credenciales incorrectas (incluye cuando la cuenta no es de rol `tecnico`)
Estado: listo

### GET /auth/perfil
Devuelve los datos del usuario autenticado (el dueño del token). Sirve para cualquier rol.
Auth: sí — `Authorization: Bearer <token>`
Respuesta 200:
{ "data": { "usuario": { "id": 2, "email": "mario@mail.com", "nombre": "Mario Gómez", "rol": "tecnico" } } }
Errores: 401 no autenticado · 401 token inválido o expirado
Estado: listo

### GET /tecnicos/perfil
Devuelve el perfil del técnico autenticado (aún puede estar sin completar: campos en `null`).
Auth: sí — `Authorization: Bearer <token>` (rol `tecnico`)
Respuesta 200:
{ "data": { "perfil": { "id": 2, "oficio": "electricidad", "descripcion": "Electricista con 8 años de experiencia.", "aniosExperiencia": 8, "distritos": ["trujillo", "la_esperanza"], "disponibilidad": [ { "dia": "lunes", "desde": "08:00", "hasta": "18:00" } ], "estadoVerificacion": "pendiente", "documentosEnviadosAt": null, "usuario": { "id": 2, "email": "mario@mail.com", "nombre": "Mario Gómez" } } } }
Errores: 401 no autenticado / token inválido · 403 no eres técnico · 404 perfil no encontrado
Estado: listo

### PUT /tecnicos/perfil
El técnico completa o actualiza su propio perfil. El cuerpo reemplaza los campos enviados.
Auth: sí — `Authorization: Bearer <token>` (rol `tecnico`)
Body:
{
  "oficio": "electricidad",
  "descripcion": "Electricista con 8 años de experiencia.",
  "aniosExperiencia": 8,
  "distritos": ["trujillo", "la_esperanza"],
  "disponibilidad": [
    { "dia": "lunes", "desde": "08:00", "hasta": "18:00" },
    { "dia": "martes", "desde": "08:00", "hasta": "18:00" }
  ]
}
Respuesta 200:
{ "data": { "perfil": { "id": 2, "oficio": "electricidad", "descripcion": "Electricista con 8 años de experiencia.", "aniosExperiencia": 8, "distritos": ["trujillo", "la_esperanza"], "disponibilidad": [ { "dia": "lunes", "desde": "08:00", "hasta": "18:00" }, { "dia": "martes", "desde": "08:00", "hasta": "18:00" } ], "estadoVerificacion": "pendiente", "usuario": { "id": 2, "email": "mario@mail.com", "nombre": "Mario Gómez" } } } }
Errores: 400 datos inválidos · 401 no autenticado / token inválido · 403 no eres técnico · 404 perfil no encontrado
Valores válidos (los valida el backend):
- `oficio`: gasfiteria | electricidad | carpinteria | albanileria | pintura
- `distritos`: trujillo | el_porvenir | florencia_de_mora | huanchaco | la_esperanza | laredo | moche | poroto | salaverry | simbal | victor_larco_herrera
- `dia`: lunes | martes | miercoles | jueves | viernes | sabado | domingo · horas en formato `HH:MM`
- `descripcion` es opcional · al menos un distrito y un día de disponibilidad · sin días repetidos
Estado: listo

### GET /tecnicos/documentos
Devuelve los documentos de verificación del técnico autenticado. La `url` es una URL privada firmada y temporal; solo el dueño (y el admin) puede acceder al archivo.
Auth: sí — `Authorization: Bearer <token>` (rol `tecnico`)
Respuesta 200:
{ "data": { "documentos": [ { "id": 5, "tipo": "dni_frente", "formato": "png", "nombreOriginal": "dni_frente.png", "bytes": 204800, "estado": "pendiente", "comentarioAdmin": null, "url": "https://api.cloudinary.com/v1_1/<cloud>/image/download?timestamp=...&public_id=...&signature=...", "createdAt": "2026-10-11T05:11:05.766Z", "updatedAt": "2026-10-11T05:11:05.766Z" } ] } }
Errores: 401 no autenticado / token inválido · 403 no eres técnico · 404 perfil no encontrado
Notas: `tipo` ∈ `dni_frente` | `dni_reverso` | `selfie` | `cul` | `certificado_oficio` · `estado` ∈ `pendiente` | `aprobado` | `observado`
Estado: listo

### POST /tecnicos/documentos/:tipo
Sube un documento de verificación (un archivo por request). Los obligatorios (`dni_frente`, `dni_reverso`, `selfie`) reemplazan el anterior; los opcionales (`cul`, `certificado_oficio`) se agregan. No se permite subir mientras la verificación está `en_revision`.
Auth: sí — `Authorization: Bearer <token>` (rol `tecnico`)
Cuerpo: `multipart/form-data` con el campo `archivo`
- Formatos: jpg, png, pdf · la `selfie` solo jpg o png · tamaño máximo 5 MB
Respuesta 201:
{ "data": { "documento": { "id": 6, "tipo": "selfie", "formato": "png", "nombreOriginal": "selfie.png", "bytes": 204800, "estado": "pendiente", "comentarioAdmin": null, "url": "https://api.cloudinary.com/v1_1/<cloud>/image/download?timestamp=...&public_id=...&signature=...", "createdAt": "2026-10-11T05:11:05.766Z", "updatedAt": "2026-10-11T05:11:05.766Z" } } }
Errores: 400 tipo inválido / sin archivo / formato no permitido / selfie en pdf / archivo mayor a 5 MB / verificación en revisión · 401 no autenticado / token inválido · 403 no eres técnico · 404 perfil no encontrado
Estado: listo

### DELETE /tecnicos/documentos/:id
Elimina un documento del propio técnico (y su archivo en Cloudinary). No se permite mientras la verificación está `en_revision`.
Auth: sí — `Authorization: Bearer <token>` (rol `tecnico`)
Respuesta 204: sin cuerpo
Errores: 400 verificación en revisión · 401 no autenticado / token inválido · 403 no eres técnico · 404 documento no encontrado
Estado: listo

### POST /tecnicos/verificacion/enviar
Envía los documentos a revisión. Exige los tres obligatorios (`dni_frente`, `dni_reverso`, `selfie`). Solo se permite desde `pendiente` u `observado`. Al enviar, pasa `estadoVerificacion` a `en_revision`, guarda `documentosEnviadosAt` y reinicia el estado de los documentos a `pendiente` (limpia comentarios del admin).
Auth: sí — `Authorization: Bearer <token>` (rol `tecnico`)
Respuesta 200:
{ "data": { "estadoVerificacion": "en_revision", "documentosEnviadosAt": "2026-10-11T05:11:05.766Z" } }
Errores: 400 faltan documentos obligatorios (`detalles.faltantes`) / ya está en revisión / ya está aprobada / cuenta suspendida / verificación rechazada (definitivo) · 401 no autenticado / token inválido · 403 no eres técnico · 404 perfil no encontrado
Estado: listo
