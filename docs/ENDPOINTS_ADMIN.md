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
