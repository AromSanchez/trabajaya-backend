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
