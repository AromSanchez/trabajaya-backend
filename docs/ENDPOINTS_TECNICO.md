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
{ "data": { "perfil": { "id": 2, "oficio": "electricidad", "descripcion": "Electricista con 8 años de experiencia.", "aniosExperiencia": 8, "distritos": ["trujillo", "la_esperanza"], "disponibilidad": [ { "dia": "lunes", "desde": "08:00", "hasta": "18:00" } ], "especialidades": ["Instalaciones eléctricas", "Tableros eléctricos"], "disponible": true, "estadoVerificacion": "pendiente", "documentosEnviadosAt": null, "usuario": { "id": 2, "email": "mario@mail.com", "nombre": "Mario Gómez" } } } }
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
  ],
  "especialidades": ["Instalaciones eléctricas", "Tableros eléctricos"],
  "disponible": true
}
Respuesta 200:
{ "data": { "perfil": { "id": 2, "oficio": "electricidad", "descripcion": "Electricista con 8 años de experiencia.", "aniosExperiencia": 8, "distritos": ["trujillo", "la_esperanza"], "disponibilidad": [ { "dia": "lunes", "desde": "08:00", "hasta": "18:00" }, { "dia": "martes", "desde": "08:00", "hasta": "18:00" } ], "especialidades": ["Instalaciones eléctricas", "Tableros eléctricos"], "disponible": true, "estadoVerificacion": "pendiente", "usuario": { "id": 2, "email": "mario@mail.com", "nombre": "Mario Gómez" } } } }
Errores: 400 datos inválidos · 401 no autenticado / token inválido · 403 no eres técnico · 404 perfil no encontrado
Valores válidos (los valida el backend):
- `oficio`: gasfiteria | electricidad | carpinteria | albanileria | pintura
- `distritos`: trujillo | el_porvenir | florencia_de_mora | huanchaco | la_esperanza | laredo | moche | poroto | salaverry | simbal | victor_larco_herrera
- `dia`: lunes | martes | miercoles | jueves | viernes | sabado | domingo · horas en formato `HH:MM`
- `descripcion` es opcional · al menos un distrito y un día de disponibilidad · sin días repetidos
- `especialidades` (opcional): máximo 5, cada una de hasta 40 caracteres, sin duplicados (se recortan los espacios de los extremos)
- `disponible` (opcional): verdadero o falso; indica si está disponible ahora (independiente del horario semanal)
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

### GET /oficios/:id/especialidades
Catálogo de especialidades sugeridas para un oficio. El técnico puede elegir de aquí o escribir las suyas (se guardan en `PUT /tecnicos/perfil`). Cualquier rol autenticado.
Auth: sí — `Authorization: Bearer <token>`
Ejemplo: `GET /oficios/electricidad/especialidades`
Respuesta 200:
{ "data": { "oficio": "electricidad", "especialidades": ["Instalaciones eléctricas", "Tableros eléctricos", "Cortocircuitos", "Puntos de luz", "Tomacorrientes"] } }
Errores: 400 oficio inválido · 401 no autenticado
Estado: listo

### GET /servicios
Lista las solicitudes de servicio asignadas al técnico autenticado, ordenadas por fecha de creación (más recientes primero).
Auth: sí — `Authorization: Bearer <token>` (rol `tecnico`)
Respuesta 200:
{ "data": { "servicios": [ { "id": 1, "estado": "pendiente", "descripcion": "Fuga de agua en la cocina", "fechaHora": "2026-10-20T15:00:00.000Z", "distrito": "trujillo", "direccion": null, "fotos": [ { "id": 1, "formato": "png", "bytes": 20480, "nombreOriginal": "fuga.png", "url": "https://api.cloudinary.com/v1_1/<cloud>/image/download?timestamp=...&public_id=...&signature=..." } ], "cliente": { "id": 1, "nombre": "Ana Pérez" }, "tecnico": { "id": 10, "nombre": "Luis Ramos" }, "comisionPorcentaje": 0, "createdAt": "2026-10-11T06:40:00.000Z" } ] } }
Errores: 401 no autenticado / token inválido · 403 no eres técnico · 404 perfil de técnico no encontrado
Notas: la `direccion` viene `null` mientras el servicio esté `pendiente`; aparece cuando pasa a `aceptado`. Nunca se incluye correo ni teléfono del cliente.
Estado: listo

### GET /servicios/:id
Detalle de una solicitud asignada al técnico (o vista por el cliente dueño o el admin).
Auth: sí — `Authorization: Bearer <token>` (rol `tecnico` asignado, `cliente` dueño o `admin`)
Errores: 400 id inválido · 401 no autenticado · 403 sin permiso · 404 la solicitud no existe o no es del técnico
Estado: listo

### POST /servicios/:id/aceptar
El técnico acepta una solicitud `pendiente`. Al aceptar, la dirección exacta del cliente pasa a ser visible.
Auth: sí — `Authorization: Bearer <token>` (rol `tecnico`)
Respuesta 200:
{ "data": { "servicio": { "id": 1, "estado": "aceptado", "direccion": "Av. Siempre Viva 742", "aceptadoAt": "2026-10-11T06:45:00.000Z" } } }
Errores: 400 id inválido · 401 no autenticado / token inválido · 403 no eres técnico · 404 la solicitud no existe o no es tuya · 409 la solicitud ya no está `pendiente`
Estado: listo

### POST /servicios/:id/rechazar
El técnico rechaza una solicitud `pendiente`. El motivo es obligatorio.
Auth: sí — `Authorization: Bearer <token>` (rol `tecnico`)
Body:
{ "motivo": "No cubro esa zona" }
Respuesta 200:
{ "data": { "servicio": { "id": 1, "estado": "rechazado", "motivoRechazo": "No cubro esa zona" } } }
Errores: 400 datos inválidos (motivo obligatorio) · 401 no autenticado / token inválido · 403 no eres técnico · 404 la solicitud no existe o no es tuya · 409 la solicitud ya no está `pendiente`
Estado: listo

### POST /servicios/:id/completar
Marca la solicitud como `completada`. Puede hacerlo el técnico o el cliente, solo desde `aceptado` y solo cuando ya llegó la fecha y hora.
Auth: sí — `Authorization: Bearer <token>` (rol `tecnico` asignado o `cliente` dueño)
Respuesta 200:
{ "data": { "servicio": { "id": 1, "estado": "completado", "completadoPorRol": "tecnico", "completadoAt": "2026-10-20T15:10:00.000Z" } } }
Errores: 400 id inválido / aún no llega la fecha y hora · 401 no autenticado / token inválido · 403 sin permiso · 404 la solicitud no existe o no es tuya · 409 la solicitud no está `aceptado`
Estado: listo

### POST /servicios/:id/cancelar
El técnico cancela una solicitud `aceptado` (motivo obligatorio). Si falta menos de 2 horas para la hora solicitada, se marca `cancelacionTardia`.
Auth: sí — `Authorization: Bearer <token>` (rol `tecnico` asignado o `cliente` dueño)
Body:
{ "motivo": "Salí de la ciudad" }
Respuesta 200:
{ "data": { "servicio": { "id": 1, "estado": "cancelado", "motivoCancelacion": "Salí de la ciudad", "canceladoPorRol": "tecnico", "cancelacionTardia": true, "canceladoAt": "2026-10-11T07:00:00.000Z" } } }
Errores: 400 datos inválidos (motivo obligatorio) · 401 no autenticado / token inválido · 403 sin permiso · 404 la solicitud no existe o no es tuya · 409 no se puede cancelar en el estado actual (el técnico solo puede cancelar en `aceptado`)
Estado: listo

### POST /servicios/:id/propuesta
El técnico envía una propuesta de precio y alcance para el servicio. Solo se puede proponer en `pendiente` o `aceptado`. Solo puede haber una propuesta pendiente a la vez: al enviar otra, la anterior queda `rechazada` ("Reemplazada por una nueva propuesta"). El cliente es quien la acepta o rechaza.
Auth: sí — `Authorization: Bearer <token>` (rol `tecnico`, asignado)
Body:
{ "monto": 150.5, "alcance": "Cambiar tomacorrientes y revisar el tablero" }
Respuesta 201:
{ "data": { "servicio": { "id": 1, "estado": "pendiente", "montoAcordado": null, "propuestas": [ { "id": 1, "monto": 150.5, "alcance": "Cambiar tomacorrientes y revisar el tablero", "estado": "pendiente", "motivoRechazo": null, "creadaPor": { "id": 10, "nombre": "Luis Ramos", "rol": "tecnico" }, "respondidaPor": null, "createdAt": "2026-10-11T06:50:00.000Z", "updatedAt": "2026-10-11T06:50:00.000Z" } ] } } }
Errores: 400 datos inválidos (monto > 0 y alcance obligatorio) · 401 no autenticado / token inválido · 403 no eres técnico · 404 la solicitud no existe o no es tuya · 409 no se puede proponer un precio en el estado actual
Estado: listo

### GET /chat/servicios/:id/mensajes
Historial de la conversación del servicio (solo el técnico asignado o el cliente dueño). Paginado; mensajes en orden ascendente.
Auth: sí — `Authorization: Bearer <token>` (rol `tecnico` asignado o `cliente` dueño)
Query (opcional): `page` (default 1), `limit` (default 30, tope 100)
Respuesta 200:
{ "data": { "mensajes": [ { "id": 1, "servicioId": 1, "contenido": "Hola, ¿cuándo puedes venir?", "autor": { "id": 1, "nombre": "Ana Pérez", "rol": "cliente" }, "createdAt": "2026-10-11T07:00:00.000Z" } ], "paginacion": { "page": 1, "limit": 30, "total": 1, "total_paginas": 1 } } }
Errores: 400 id inválido / paginación inválida · 401 no autenticado / token inválido · 403 no eres técnico ni cliente · 404 la solicitud no existe o no eres participante
Estado: listo

### POST /chat/servicios/:id/mensajes
Envía un mensaje de texto. Solo se puede escribir mientras el servicio está `pendiente` o `aceptado`; en estados finales el chat es solo lectura. Si hay Socket.IO conectado, se difunde `mensaje:nuevo` a la sala del servicio.
Auth: sí — `Authorization: Bearer <token>` (rol `tecnico` asignado o `cliente` dueño)
Body:
{ "contenido": "Puedo mañana a las 9" }
Respuesta 201:
{ "data": { "mensaje": { "id": 2, "servicioId": 1, "contenido": "Puedo mañana a las 9", "autor": { "id": 10, "nombre": "Luis Ramos", "rol": "tecnico" }, "createdAt": "2026-10-11T07:01:00.000Z" } } }
Errores: 400 id inválido / mensaje vacío o mayor a 1000 caracteres · 401 no autenticado / token inválido · 403 no eres técnico ni cliente · 404 la solicitud no existe o no eres participante · 409 el chat de este servicio está cerrado
Estado: listo

## Chat en tiempo real (Socket.IO)
Conectar con `io(url, { auth: { token } })` usando el JWT del login. Sin token o con token inválido la conexión se rechaza. Eventos:
- Emitir `servicio:unirse` `{ "servicio_id": 1 }` → callback `{ "ok": true, "servicio_id": 1 }` o `{ "error": "..." }`.
- Emitir `mensaje:enviar` `{ "servicio_id": 1, "contenido": "..." }` → callback `{ "ok": true, "mensaje": { ... } }` o `{ "error": "..." }`.
- Escuchar `mensaje:nuevo` `{ "mensaje": { ... } }`.
- Escuchar `servicio:error` / `mensaje:error` `{ "error": "..." }`.
Estado: listo
