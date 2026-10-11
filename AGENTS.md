# AGENTS.md — Backend de Trabajo Ya

## Proyecto
Trabajo Ya es un marketplace móvil independiente que conecta clientes del hogar con técnicos verificados (electricidad, plomería, mantenimiento). Flujo principal: el cliente busca un oficio, revisa técnicos verificados, habla con uno, acuerdan el servicio, se realiza y el cliente califica.

Este repositorio es el **backend único** de tres clientes:
1. App del cliente (Flutter)
2. App del técnico (Flutter)
3. Plataforma web de administración (verificación de técnicos, reportes, métricas)

No hay municipalidad ni respaldo municipal. La verificación la gestiona el equipo de Trabajo Ya.

## Stack
- Node.js + Express
- PostgreSQL + Prisma 7
- JWT + bcrypt (login propio) y Google OAuth
- Socket.IO (chat y estados del servicio)
- Zod (validación de todo lo que entra)
- Multer + Cloudinary (fotos y documentos)

## Estructura
```
src/modules/    auth, tecnicos, servicios, chat, resenas, reportes
src/middlewares/
src/config/
prisma/
docs/           PROGRESS.md, ENDPOINTS_CLIENTE.md, ENDPOINTS_TECNICO.md, ENDPOINTS_ADMIN.md
```
Respeta esta estructura. Cada módulo tiene sus rutas, controlador, servicio y esquemas Zod.

## Reglas de trabajo
1. **Memoria:** al empezar lee `docs/PROGRESS.md`. Trabaja solo la tarea marcada como "En curso". Al terminar, márcala como hecha, anota lo importante y deja la siguiente como "En curso".
2. **Una tarea a la vez.** No adelantes tareas futuras ni refactorices lo que no se pidió.
3. **Endpoints:** en la misma tarea en que crees o cambies un endpoint, actualiza el archivo de `docs/` que corresponda (cliente, técnico o admin) con el formato fijo de abajo. Una tarea no está terminada sin esto.
4. **Documentación de librerías:** consulta Context7 para Prisma 7 y cualquier librería antes de escribir código. No uses sintaxis de memoria.
5. **Validación:** todo body, query y param se valida con Zod.
6. **Permisos:** cada endpoint comprueba el rol (cliente, técnico, admin) y que el usuario solo acceda a sus propios datos.
7. **Verificación y comisión** se calculan solo en el backend, nunca confiando en lo que envía la app.
8. **Migraciones:** todo cambio de base de datos va en una migración de Prisma. Pide confirmación antes de borrar tablas o datos.
9. **Sesión:** al empezar una sesión, lee AGENTS.md, `docs/PROGRESS.md` y `docs/DECISIONES.md`.
10. **Decisiones:** cada vez que se tome una decisión de negocio o de arquitectura, anótala en `docs/DECISIONES.md` en esa misma tarea.
11. **Cierre de tarea:** al terminar cada tarea, actualiza `docs/PROGRESS.md` y revisa que `docs/DECISIONES.md` y los archivos de endpoints (`docs/ENDPOINTS_*.md`) estén al día.

## Cuándo preguntarme
Pregúntame siempre que falte un dato técnico o dudes. No inventes valores. En especial:
- Credenciales y claves: URL de la base de datos, Google OAuth (Client ID y Secret), Cloudinary, secreto JWT. Pídelas, indícame en qué variable de `.env` van y no sigas con esa parte hasta tenerlas.
- Reglas de negocio no definidas (estados, comisión, quién ve qué).
- Cualquier decisión que cambie el modelo de datos.

## Seguridad
- Secretos solo en `.env`, que está en `.gitignore`. Nunca en el código ni en el chat.
- Mantén un `.env.example` sin valores reales.
- Contraseñas con bcrypt. Respuestas de error sin detalles internos.
- No expongas datos de verificación (documentos) a nadie fuera del propio técnico y el admin.
- La dirección exacta del cliente solo se muestra al técnico del servicio confirmado.

## Formato fijo de endpoints (en `docs/`)
```
### POST /auth/login
Auth: no
Body:
{ "email": "ana@mail.com", "password": "123456" }
Respuesta 200:
{ "token": "jwt...", "usuario": { "id": 1, "rol": "cliente" } }
Errores: 401 credenciales incorrectas
Estado: listo | en desarrollo | planificado
```
Usa ejemplos reales de JSON. Indica siempre si es POST, PUT, PATCH, GET o DELETE y cómo se envía el cuerpo.

## Estilo de código
- JavaScript moderno, nombres claros, funciones cortas.
- Respuestas JSON consistentes: `{ "data": ... }` o `{ "error": "mensaje" }`.
- Mensajes de error en español.
