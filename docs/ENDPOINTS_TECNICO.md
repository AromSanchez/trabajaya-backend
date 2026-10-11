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
{ "data": { "perfil": { "id": 2, "oficio": "electricidad", "descripcion": "Electricista con 8 años de experiencia.", "aniosExperiencia": 8, "distritos": ["trujillo", "la_esperanza"], "disponibilidad": [ { "dia": "lunes", "desde": "08:00", "hasta": "18:00" } ], "estadoVerificacion": "pendiente", "usuario": { "id": 2, "email": "mario@mail.com", "nombre": "Mario Gómez" } } } }
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
