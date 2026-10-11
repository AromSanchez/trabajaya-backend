# Endpoints — App del cliente

### POST /auth/cliente/registro
Auth: no
Body:
{ "email": "ana@mail.com", "password": "123456", "nombre": "Ana Pérez" }
Respuesta 201:
{ "data": { "token": "eyJhbGci...", "usuario": { "id": 1, "email": "ana@mail.com", "nombre": "Ana Pérez", "rol": "cliente" } } }
Errores: 400 datos inválidos · 409 el correo ya está registrado
Estado: listo

### POST /auth/cliente/login
Auth: no
Body:
{ "email": "ana@mail.com", "password": "123456" }
Respuesta 200:
{ "data": { "token": "eyJhbGci...", "usuario": { "id": 1, "email": "ana@mail.com", "nombre": "Ana Pérez", "rol": "cliente" } } }
Errores: 400 datos inválidos · 401 credenciales incorrectas (incluye cuando la cuenta no es de rol `cliente`)
Estado: listo

### GET /auth/perfil
Devuelve los datos del usuario autenticado (el dueño del token). Sirve para cualquier rol.
Auth: sí — `Authorization: Bearer <token>`
Respuesta 200:
{ "data": { "usuario": { "id": 1, "email": "ana@mail.com", "nombre": "Ana Pérez", "rol": "cliente" } } }
Errores: 401 no autenticado · 401 token inválido o expirado
Estado: listo

### GET /tecnicos
Búsqueda de técnicos verificados y con perfil completo. Solo rol `cliente`.
Auth: sí — rol `cliente`
Query (todos opcionales):
- `oficio`: uno del catálogo (`gasfiteria`, `electricidad`, `carpinteria`, `albanileria`, `pintura`)
- `distrito`: uno de los 11 distritos (p. ej. `trujillo`)
- `nombre`: texto libre (coincidencia parcial, sin distinguir mayúsculas)
- `page`: página (por defecto 1)
- `limit`: resultados por página (por defecto 20, máximo 50; si piden más se recorta a 50)
Ejemplo: `GET /tecnicos?oficio=electricidad&distrito=trujillo&page=1&limit=20`
Respuesta 200:
{
  "data": {
    "tecnicos": [
      {
        "id": 10,
        "nombre": "Luis Ramos",
        "oficio": "electricidad",
        "aniosExperiencia": 10,
        "especialidades": ["Instalaciones eléctricas", "Tableros eléctricos"],
        "distritos": ["trujillo", "la_esperanza"],
        "disponible": true,
        "verificado": true,
        "calificacionPromedio": null,
        "totalResenas": 0,
        "serviciosCompletados": 0
      }
    ],
    "paginacion": { "page": 1, "limit": 20, "total": 1, "total_paginas": 1 }
  }
}
Notas: orden = `disponible` primero, luego mayor `calificacionPromedio` (los sin reseñas al final), luego más `serviciosCompletados`, luego más años de experiencia. `calificacionPromedio` es `null` mientras no haya reseñas visibles. Una página fuera de rango devuelve `tecnicos: []`.
Errores: 400 oficio/distrito/página/límite inválidos · 401 no autenticado · 403 si no es `cliente`
Estado: listo

### GET /tecnicos/:id
Perfil público de un técnico verificado. Solo rol `cliente`.
Auth: sí — rol `cliente`
Ejemplo: `GET /tecnicos/10`
Respuesta 200:
{
  "data": {
    "tecnico": {
      "id": 10,
      "nombre": "Luis Ramos",
      "oficio": "electricidad",
      "descripcion": "Electricista con 10 años de experiencia",
      "aniosExperiencia": 10,
      "especialidades": ["Instalaciones eléctricas", "Tableros eléctricos"],
      "distritos": ["trujillo", "la_esperanza"],
      "disponible": true,
      "disponibilidad": [{ "dia": "lunes", "desde": "08:00", "hasta": "18:00" }],
      "verificado": true,
      "calificacionPromedio": null,
      "totalResenas": 0,
      "serviciosCompletados": 0
    }
  }
}
Notas: no incluye correo, teléfono, dirección, DNI, selfie ni documentos. `disponibilidad` es el horario semanal; `disponible` es el estado actual. `calificacionPromedio` es `null` mientras no haya reseñas visibles; `totalResenas` y `serviciosCompletados` se calculan con las reseñas visibles y los servicios completados.
Errores: 400 id inválido · 401 no autenticado · 403 si no es `cliente` · 404 el técnico no existe, no está verificado o no tiene oficio
Estado: listo

### GET /oficios/:id/especialidades
Catálogo de especialidades sugeridas para un oficio. Cualquier rol autenticado.
Auth: sí
Ejemplo: `GET /oficios/electricidad/especialidades`
Respuesta 200:
{ "data": { "oficio": "electricidad", "especialidades": ["Instalaciones eléctricas", "Tableros eléctricos", "Cortocircuitos", "Puntos de luz", "Tomacorrientes"] } }
Errores: 400 oficio inválido · 401 no autenticado
Estado: listo

### POST /servicios
El cliente crea una solicitud de servicio dirigida a un solo técnico. Solo se puede solicitar a técnicos verificados y disponibles.
Auth: sí — rol `cliente`
Cuerpo: `multipart/form-data`
- `tecnico_id` (obligatorio): id del técnico
- `descripcion` (obligatorio): máximo 500 caracteres
- `fecha_hora` (obligatorio): fecha y hora deseadas en ISO 8601, futura (p. ej. `2026-10-20T15:00:00.000Z`)
- `distrito` (obligatorio): uno de los 11 distritos
- `direccion` (obligatorio): dirección exacta
- `fotos` (opcional): hasta 3 archivos jpg o png, máximo 5 MB cada uno
Ejemplo (multipart): `tecnico_id=10`, `descripcion=Fuga de agua en la cocina`, `fecha_hora=2026-10-20T15:00:00.000Z`, `distrito=trujillo`, `direccion=Av. Siempre Viva 742`, `fotos=<archivo>`
Respuesta 201:
{
  "data": {
    "servicio": {
      "id": 1,
      "estado": "pendiente",
      "descripcion": "Fuga de agua en la cocina",
      "fechaHora": "2026-10-20T15:00:00.000Z",
      "distrito": "trujillo",
      "direccion": "Av. Siempre Viva 742",
      "fotos": [ { "id": 1, "formato": "png", "bytes": 20480, "nombreOriginal": "fuga.png", "url": "https://api.cloudinary.com/v1_1/<cloud>/image/download?timestamp=...&public_id=...&signature=..." } ],
      "cliente": { "id": 1, "nombre": "Ana Pérez" },
      "tecnico": { "id": 10, "nombre": "Luis Ramos" },
      "motivoRechazo": null,
      "motivoCancelacion": null,
      "cancelacionTardia": false,
      "canceladoPorRol": null,
      "canceladoAt": null,
      "completadoPorRol": null,
      "completadoAt": null,
      "aceptadoAt": null,
      "comisionPorcentaje": 0,
      "createdAt": "2026-10-11T06:40:00.000Z",
      "updatedAt": "2026-10-11T06:40:00.000Z"
    }
  }
}
Errores: 400 datos inválidos / fecha no futura / más de 3 fotos / foto que no es jpg o png · 401 no autenticado · 403 no eres cliente · 404 técnico no encontrado · 409 el técnico no está verificado, no está disponible, ya tienes una solicitud pendiente con ese técnico o ya tienes 3 pendientes
Estado: listo

### GET /servicios
Lista las solicitudes del usuario autenticado: el cliente ve las suyas, el técnico las que tiene asignadas. Ordenadas por fecha de creación (más recientes primero).
Auth: sí — rol `cliente` o `tecnico`
Respuesta 200:
{ "data": { "servicios": [ { "id": 1, "estado": "pendiente", "descripcion": "Fuga de agua en la cocina", "fechaHora": "2026-10-20T15:00:00.000Z", "distrito": "trujillo", "direccion": "Av. Siempre Viva 742", "fotos": [], "cliente": { "id": 1, "nombre": "Ana Pérez" }, "tecnico": { "id": 10, "nombre": "Luis Ramos" }, "comisionPorcentaje": 0, "createdAt": "2026-10-11T06:40:00.000Z" } ] } }
Errores: 401 no autenticado · 403 si no es `cliente` ni `tecnico`
Notas: el cliente siempre ve la `direccion`; al técnico se le devuelve `null` mientras el servicio esté `pendiente`.
Estado: listo

### GET /servicios/:id
Detalle de una solicitud. Solo el cliente dueño, el técnico asignado o el admin.
Auth: sí — rol `cliente` (dueño), `tecnico` (asignado) o `admin`
Respuesta 200:
{ "data": { "servicio": { "id": 1, "estado": "aceptado", "descripcion": "Fuga de agua en la cocina", "fechaHora": "2026-10-20T15:00:00.000Z", "distrito": "trujillo", "direccion": "Av. Siempre Viva 742", "fotos": [], "cliente": { "id": 1, "nombre": "Ana Pérez" }, "tecnico": { "id": 10, "nombre": "Luis Ramos" }, "aceptadoAt": "2026-10-11T06:45:00.000Z", "comisionPorcentaje": 0, "montoAcordado": 150.5, "alcanceAcordado": "Cambiar tomacorrientes", "propuestas": [ { "id": 1, "monto": 150.5, "alcance": "Cambiar tomacorrientes", "estado": "aceptada", "motivoRechazo": null, "creadaPor": { "id": 10, "nombre": "Luis Ramos", "rol": "tecnico" }, "respondidaPor": { "id": 1, "nombre": "Ana Pérez", "rol": "cliente" }, "createdAt": "2026-10-11T06:50:00.000Z", "updatedAt": "2026-10-11T06:52:00.000Z" } ] } } }
Errores: 400 id inválido · 401 no autenticado · 403 si no tiene permiso · 404 la solicitud no existe o no es del usuario
Notas: la `direccion` se devuelve al técnico solo si el estado es `aceptado` o `completado`. Toda respuesta de un servicio incluye `montoAcordado`, `alcanceAcordado` y `propuestas`.
Estado: listo

### POST /servicios/:id/completar
Marca la solicitud como `completada`. Puede hacerlo el cliente o el técnico, solo desde `aceptado` y solo cuando ya llegó la fecha y hora. Se guarda quién lo marcó.
Auth: sí — rol `cliente` (dueño) o `tecnico` (asignado)
Respuesta 200:
{ "data": { "servicio": { "id": 1, "estado": "completado", "completadoPorRol": "cliente", "completadoAt": "2026-10-20T15:10:00.000Z" } } }
Errores: 400 id inválido / aún no llega la fecha y hora · 401 no autenticado · 403 si no tiene permiso · 404 la solicitud no existe o no es del usuario · 409 la solicitud no está `aceptado`
Estado: listo

### POST /servicios/:id/cancelar
Cancela la solicitud (motivo obligatorio). El cliente puede cancelar en `pendiente` o `aceptado`; el técnico solo en `aceptado`. Si se cancela desde `aceptado` con menos de 2 horas para la hora solicitada, se marca `cancelacionTardia`.
Auth: sí — rol `cliente` (dueño) o `tecnico` (asignado)
Body:
{ "motivo": "Cambio de planes" }
Respuesta 200:
{ "data": { "servicio": { "id": 1, "estado": "cancelado", "motivoCancelacion": "Cambio de planes", "canceladoPorRol": "cliente", "cancelacionTardia": false, "canceladoAt": "2026-10-11T07:00:00.000Z" } } }
Errores: 400 datos inválidos (motivo obligatorio) · 401 no autenticado · 403 si no tiene permiso · 404 la solicitud no existe o no es del usuario · 409 no se puede cancelar en el estado actual
Estado: listo

### POST /servicios/:id/propuesta/aceptar
El cliente acepta la propuesta de precio y alcance pendiente del técnico. Al aceptar se guardan `montoAcordado` y `alcanceAcordado` en el servicio; **no** cambia el estado del servicio. Solo se puede aceptar en `pendiente` o `aceptado`.
Auth: sí — rol `cliente` (dueño)
Respuesta 200:
{ "data": { "servicio": { "id": 1, "estado": "pendiente", "montoAcordado": 150.5, "alcanceAcordado": "Cambiar tomacorrientes", "propuestas": [ { "id": 1, "monto": 150.5, "alcance": "Cambiar tomacorrientes", "estado": "aceptada", "respondidaPor": { "id": 1, "nombre": "Ana Pérez", "rol": "cliente" } } ] } } }
Errores: 400 id inválido · 401 no autenticado · 403 no eres cliente · 404 la solicitud no existe, no es tuya o no hay propuesta pendiente · 409 no se puede aceptar una propuesta en el estado actual
Estado: listo

### POST /servicios/:id/propuesta/rechazar
El cliente rechaza la propuesta pendiente del técnico (motivo opcional).
Auth: sí — rol `cliente` (dueño)
Body (opcional):
{ "motivo": "Muy caro" }
Respuesta 200:
{ "data": { "servicio": { "id": 1, "estado": "pendiente", "propuestas": [ { "id": 1, "monto": 150.5, "alcance": "Cambiar tomacorrientes", "estado": "rechazada", "motivoRechazo": "Muy caro", "respondidaPor": { "id": 1, "nombre": "Ana Pérez", "rol": "cliente" } } ] } } }
Errores: 400 datos inválidos · 401 no autenticado · 403 no eres cliente · 404 la solicitud no existe, no es tuya o no hay propuesta pendiente · 409 no se puede rechazar una propuesta en el estado actual
Estado: listo

### GET /chat/servicios/:id/mensajes
Historial de la conversación del servicio (solo cliente dueño o técnico asignado). Paginado; devuelve los mensajes en orden ascendente.
Auth: sí — rol `cliente` (dueño) o `tecnico` (asignado)
Query (opcional): `page` (default 1), `limit` (default 30, tope 100)
Respuesta 200:
{ "data": { "mensajes": [ { "id": 1, "servicioId": 1, "contenido": "Hola, ¿cuándo puedes venir?", "autor": { "id": 1, "nombre": "Ana Pérez", "rol": "cliente" }, "createdAt": "2026-10-11T07:00:00.000Z" } ], "paginacion": { "page": 1, "limit": 30, "total": 1, "total_paginas": 1 } } }
Errores: 400 id inválido / paginación inválida · 401 no autenticado · 403 no eres cliente ni técnico · 404 la solicitud no existe o no eres participante
Estado: listo

### POST /chat/servicios/:id/mensajes
Envía un mensaje de texto. Solo se puede escribir mientras el servicio está `pendiente` o `aceptado`; en estados finales el chat es solo lectura. Si hay Socket.IO conectado, se difunde `mensaje:nuevo` a la sala del servicio.
Auth: sí — rol `cliente` (dueño) o `tecnico` (asignado)
Body:
{ "contenido": "Hola, ¿cuándo puedes venir?" }
Respuesta 201:
{ "data": { "mensaje": { "id": 1, "servicioId": 1, "contenido": "Hola, ¿cuándo puedes venir?", "autor": { "id": 1, "nombre": "Ana Pérez", "rol": "cliente" }, "createdAt": "2026-10-11T07:00:00.000Z" } } }
Errores: 400 id inválido / mensaje vacío o mayor a 1000 caracteres · 401 no autenticado · 403 no eres cliente ni técnico · 404 la solicitud no existe o no eres participante · 409 el chat de este servicio está cerrado
Estado: listo

## Chat en tiempo real (Socket.IO)
Conexión con `io(url, { auth: { token } })` usando el JWT del login. Sin token o con token inválido la conexión se rechaza. Eventos:
- Emitir `servicio:unirse` `{ "servicio_id": 1 }` → callback `{ "ok": true, "servicio_id": 1 }` o `{ "error": "..." }`. Une al socket a la sala del servicio (solo si es participante).
- Emitir `mensaje:enviar` `{ "servicio_id": 1, "contenido": "..." }` → callback `{ "ok": true, "mensaje": { ... } }` o `{ "error": "..." }`.
- Escuchar `mensaje:nuevo` `{ "mensaje": { ... } }` (llega a todos los conectados a la sala).
- Escuchar `servicio:error` / `mensaje:error` `{ "error": "..." }` cuando una operación falla.
Estado: listo

### POST /cliente/servicios/:id/resena
El cliente califica al técnico de un servicio **completado**. Una sola reseña por servicio; no se edita ni se borra. Al crearla, el backend recalcula en una transacción el promedio y el número de reseñas del técnico.
Auth: sí — rol `cliente` (dueño del servicio)
Body:
{ "calificacion": 5, "comentario": "Excelente trabajo" }
`calificacion`: entero de 1 a 5 (obligatorio) · `comentario`: texto de hasta 500 caracteres (opcional)
Respuesta 201:
{ "data": { "resena": { "id": 1, "calificacion": 5, "comentario": "Excelente trabajo", "createdAt": "2026-10-11T08:00:00.000Z" } } }
Errores: 400 datos inválidos / calificación fuera de 1-5 / comentario demasiado largo · 401 no autenticado · 403 no eres cliente · 404 la solicitud no existe o no es tuya · 409 el servicio no está `completado` o ya calificaste este servicio
Estado: listo

### GET /cliente/servicios/historial
Historial de los servicios del cliente (todos los estados), cada uno con su reseña si existe. Paginado, del más reciente al más antiguo.
Auth: sí — rol `cliente`
Query (opcional): `estado` ∈ `pendiente` | `aceptado` | `completado` | `rechazado` | `cancelado` | `expirado` · `page` (default 1) · `limit` (default 20, tope 50)
Respuesta 200:
{ "data": { "servicios": [ { "id": 1, "estado": "completado", "descripcion": "Fuga de agua en la cocina", "fechaHora": "2026-10-20T15:00:00.000Z", "distrito": "trujillo", "direccion": "Av. Siempre Viva 742", "fotos": [], "cliente": { "id": 1, "nombre": "Ana Pérez" }, "tecnico": { "id": 10, "nombre": "Luis Ramos" }, "montoAcordado": 150.5, "alcanceAcordado": "Cambiar tomacorrientes", "resena": { "id": 1, "calificacion": 5, "comentario": "Excelente trabajo", "createdAt": "2026-10-11T08:00:00.000Z" } } ], "paginacion": { "page": 1, "limit": 20, "total": 1, "total_paginas": 1 } } }
Errores: 400 estado o paginación inválidos · 401 no autenticado · 403 no eres cliente
Notas: cada ítem trae los mismos campos que `GET /servicios/:id` más `resena` (o `null`). El cliente siempre ve la `direccion`. Una página fuera de rango devuelve `servicios: []`.
Estado: listo

### GET /tecnicos/:id/resenas
Lista paginada de las reseñas visibles de un técnico verificado. Solo rol `cliente`.
Auth: sí — rol `cliente`
Query (opcional): `page` (default 1) · `limit` (default 20, tope 50)
Respuesta 200:
{ "data": { "resenas": [ { "id": 1, "calificacion": 5, "comentario": "Excelente trabajo", "cliente": "Ana T.", "createdAt": "2026-10-11T08:00:00.000Z" } ], "paginacion": { "page": 1, "limit": 20, "total": 1, "total_paginas": 1 } } }
Errores: 400 id o paginación inválidos · 401 no autenticado · 403 no eres cliente · 404 el técnico no existe, no está verificado o no tiene oficio
Notas: orden de la más reciente a la más antigua. Se muestran solo reseñas **no ocultas**. El autor aparece como primer nombre + inicial del apellido (p. ej. `Ana T.`); nunca otros datos del cliente.
Estado: listo
