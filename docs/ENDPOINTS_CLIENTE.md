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
Notas: orden = disponible primero, luego más años de experiencia. `calificacionPromedio` es `null` y los contadores son `0` hasta que existan reseñas (T10) y servicios (T8). Una página fuera de rango devuelve `tecnicos: []`.
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
Notas: no incluye correo, teléfono, dirección, DNI, selfie ni documentos. `disponibilidad` es el horario semanal; `disponible` es el estado actual. `calificacionPromedio` es `null` y los contadores son `0` hasta T8/T10.
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
