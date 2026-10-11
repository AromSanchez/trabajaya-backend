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
