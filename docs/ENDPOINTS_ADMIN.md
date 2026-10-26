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

### GET /admin/metricas/dashboard
Devuelve en una sola llamada todos los datos del panel de control: tarjetas superiores, prioridad del día, series de gráficos, distribución por estado/oficio, reportes por motivo, cancelaciones tardías por semana, tiempo medio de verificación, cola de revisión y métricas de marketplace.
Auth: sí — `Authorization: Bearer <token>` (rol `admin`)
Query (opcional): `semanas_registros` (default 12, 1–52) · `semanas_cancelaciones` (default 8, 1–52) · `dias_reportes` (default 30, 1–365) · `limit_cola` (default 5, 1–50) · `meses` (opcional, 2–12) · `mes` (opcional, `YYYY-MM`): si se envía, la respuesta incluye `seriesMensuales` con 12 meses terminando en ese mes y `periodo` (`seleccionado`/`anterior`). Sin `mes`/`meses`, solo series semanales.
Ejemplo: `GET /admin/metricas/dashboard?semanas_registros=12&semanas_cancelaciones=8&dias_reportes=30&limit_cola=5`
Respuesta 200:
{ "data": {
  "generadoEn": "2026-10-18T20:56:20.300Z",
  "prioridadHoy": { "tecnicosEnEspera": 15, "masAntiguoDias": 4 },
  "tarjetas": {
    "reportesAbiertos": { "total": 10, "vsSemanaPasada": 14, "masDe48h": 10 },
    "tecnicosTotales": { "total": 16, "nuevosSemana": 16 },
    "verificados": { "total": 1, "nuevosSemana": 1, "porcentajeDelTotal": 6.3 },
    "enRevision": { "total": 15, "vsSemanaPasada": 16 }
  },
  "registrosVerificaciones": { "semanas": 12, "serie": [ { "semanaInicio": "2026-10-05T00:00:00.000Z", "registrosNuevos": 0, "verificados": 0 }, { "semanaInicio": "2026-10-12T00:00:00.000Z", "registrosNuevos": 16, "verificados": 1 } ] },
  "tecnicosPorEstado": { "total": 16, "estados": [ { "estado": "pendiente", "total": 0, "porcentaje": 0 }, { "estado": "en_revision", "total": 15, "porcentaje": 93.8 }, { "estado": "verificado", "total": 1, "porcentaje": 6.3 }, { "estado": "observado", "total": 0, "porcentaje": 0 }, { "estado": "rechazado", "total": 0, "porcentaje": 0 }, { "estado": "suspendido", "total": 0, "porcentaje": 0 } ] },
  "reportesPorMotivo": { "dias": 30, "total": 14, "motivos": [ { "categoria": "comportamiento_inapropiado", "total": 3, "porcentaje": 21.4 }, { "categoria": "trabajo_deficiente", "total": 3, "porcentaje": 21.4 } ] },
  "cancelacionesTardiasSemanales": { "semanas": 8, "serie": [ { "semanaInicio": "2026-10-05T00:00:00.000Z", "total": 6 }, { "semanaInicio": "2026-10-12T00:00:00.000Z", "total": 1 } ], "pico": 6 },
  "tecnicosPorOficio": { "total": 16, "oficios": [ { "oficio": "pintura", "total": 5, "porcentaje": 31.3 }, { "oficio": "electricidad", "total": 4, "porcentaje": 25 }, { "oficio": "carpinteria", "total": 3, "porcentaje": 18.8 }, { "oficio": "gasfiteria", "total": 2, "porcentaje": 12.5 }, { "oficio": "albanileria", "total": 2, "porcentaje": 12.5 } ] },
  "tiempoVerificacion": { "promedioHoras": 38.5, "vsMesPasadoPorcentaje": -27 },
  "colaRevision": { "tecnicos": [ { "id": 2, "nombre": "Edwin Iglesias", "oficio": "electricidad", "distrito": "trujillo", "diasEsperando": 4, "estadoDocumentos": "faltan", "faltantes": ["cul", "certificado_oficio"], "documentosEnviadosAt": "2026-10-14T05:22:39.434Z" } ] },
  "marketplace": {
    "servicios": {
      "total": 150,
      "porEstado": [
        { "estado": "pendiente", "total": 10, "porcentaje": 6.67 },
        { "estado": "aceptado", "total": 5, "porcentaje": 3.33 },
        { "estado": "completado", "total": 120, "porcentaje": 80.0 },
        { "estado": "cancelado", "total": 8, "porcentaje": 5.33 },
        { "estado": "expirado", "total": 5, "porcentaje": 3.33 },
        { "estado": "rechazado", "total": 2, "porcentaje": 1.33 }
      ],
      "tasaConversionCompletado": 80.0,
      "evolucionCompletadasSemanal": {
        "semanas": 8,
        "serie": [
          { "semanaInicio": "2026-09-07T00:00:00.000Z", "completadas": 12 },
          { "semanaInicio": "2026-09-14T00:00:00.000Z", "completadas": 15 }
        ]
      },
      "tiempoPromedioSolicitudAAceptacionHoras": 1.8,
      "tiempoPromedioAceptacionACompletadoHoras": 4.2
    },
    "clientes": {
      "total": 50,
      "nuevosEstaSemana": 3,
      "activos30Dias": 28,
      "retencionDosOMasCompletados": 62.5
    },
    "calidad": {
      "calificacionPromedioGeneral": 4.7,
      "tasaResenas": 85.0,
      "distribucionCalificaciones": [
        { "estrellas": 5, "total": 85 },
        { "estrellas": 4, "total": 20 },
        { "estrellas": 3, "total": 8 },
        { "estrellas": 2, "total": 3 },
        { "estrellas": 1, "total": 4 }
      ]
    },
    "tecnicosActivos": {
      "porcentajeVerificadosConServicio30Dias": 72.5,
      "top5": [
        { "id": 2, "nombre": "Jair Iglesias", "total": 25 },
        { "id": 5, "nombre": "Mario Gómez", "total": 18 }
      ]
    }
  }
} }
Errores: 400 paginación o periodos inválidos · 401 no autenticado / token inválido · 403 no eres admin
Notas: no hay metas configuradas todavía, así que no se devuelve `meta` ni `dentroDeMeta`. `vsSemanaPasada` compara altas de los últimos 7 días contra los 7 anteriores. El tiempo de verificación solo cuenta técnicos **ya decididos** (registro → primera decisión del admin hacia `verificado`/`observado`/`rechazado`). `registrosVerificaciones.serie[].verificados` y `tarjetas.verificados.nuevosSemana` cuentan por `Tecnico.verificadoAt` (fecha en que el admin lo pasó a `verificado`, también al reactivar), por lo que son coherentes con `tecnicosPorEstado.verificado`: un técnico primero observado y luego aprobado cuenta en la semana en que se aprobó. Si no hay datos suficientes, `vsMesPasadoPorcentaje` y `promedioHoras` pueden ser `null`. Para `marketplace`, los promedios de tiempo que no tengan datos suficientes devuelven `null`. `tasaConversionCompletado` = (`completado` / total solicitudes) * 100. `retencionDosOMasCompletados` = (% de clientes con ≥2 servicios completados sobre clientes con al menos 1 servicio completado o sobre base definida; se calcula sobre clientes con al menos 1 servicio completado). `tasaResenas` = (servicios completados con reseña / servicios completados) * 100. `porcentajeVerificadosConServicio30Dias` = (técnicos verificados con al menos 1 servicio en los últimos 30 días / técnicos verificados totales) * 100.
Estado: listo

### GET /admin/metricas/monetizacion
Series temporales semanales de monetización para graficar evolución: modelos activos, ingresos por fuente y adopción de los verificados, más un resumen de totales actuales.
Auth: sí — `Authorization: Bearer <token>` (rol `admin`)
Query (opcional): `semanas` (default 8, 1–52) · `meses` (opcional, 2–12) · `mes` (opcional, `YYYY-MM`): si se envía, la respuesta incluye `ingresosMensuales` y `modelosMensuales` con 12 meses terminando en ese mes y `periodo`.
Ejemplo: `GET /admin/metricas/monetizacion?semanas=8`
Respuesta 200:
{ "data": {
  "generadoEn": "2026-10-25T18:00:00.000Z",
  "modelosActivos": {
    "totales": { "creditos": 3, "mensualidad": 2, "ninguno": 12 },
    "serie": [
      { "semanaInicio": "2026-09-07T00:00:00.000Z", "creditos": 1, "mensualidad": 0 },
      { "semanaInicio": "2026-09-14T00:00:00.000Z", "creditos": 2, "mensualidad": 0 },
      { "semanaInicio": "2026-09-21T00:00:00.000Z", "creditos": 2, "mensualidad": 1 }
    ]
  },
  "ingresos": {
    "serie": [
      { "semanaInicio": "2026-10-12T00:00:00.000Z", "ingresosCreditosSemana": 100, "ingresosMensualidadSemana": 150, "ingresosComisionesSemana": 0, "ingresosTotalSemana": 250 },
      { "semanaInicio": "2026-10-19T00:00:00.000Z", "ingresosCreditosSemana": 30, "ingresosMensualidadSemana": 0, "ingresosComisionesSemana": 7.5, "ingresosTotalSemana": 37.5 }
    ]
  },
  "adopcion": {
    "serie": [
      { "semanaInicio": "2026-10-05T00:00:00.000Z", "verificadosSemana": 4, "conModeloActivoSemana": 2 },
      { "semanaInicio": "2026-10-12T00:00:00.000Z", "verificadosSemana": 1, "conModeloActivoSemana": 1 }
    ]
  },
  "resumen": {
    "totalConCreditos": 3,
    "totalConMensualidad": 2,
    "totalSinModelo": 12,
    "ingresosTotalesCreditos": 290,
    "ingresosTotalesMensualidad": 150,
    "ingresosTotalesComisiones": 37.5,
    "ingresosTotales": 477.5,
    "modeloMasElegido": "creditos",
    "porcentajeMonetizados": 29.4
  }
} }
Errores: 400 semanas inválido (no entero, < 1 o > 52) · 401 no autenticado / token inválido · 403 no eres admin
Notas: semanas desde el lunes (UTC), igual que el resto del dashboard; si no hubo datos en una semana los valores van en `0` (nunca `null`).
- **`modelosActivos.serie` (semana):** técnicos que **tenían ese modelo activo al cierre de la semana**, reconstruido desde el historial de transacciones: la última `compra_creditos`/`cambio_modelo` hacia créditos pone `creditos`, y la última `activacion_plan`/`cambio_modelo` hacia plan pone `mensualidad`. Un técnico puede cambiar de modelo en el pasado, así que puede verse un técnico moverse entre columnas entre semanas (es evolución real, no conteo acumulado de adopciones).
- **`modelosActivos.totales` y `resumen`:** cuentan **solo técnicos `verificado`** con fila de monetización (`MonetizacionTecnico.tipo`); `ninguno` = verificados sin fila o con `tipo: null` (los técnicos suspendidos/rechazados con fila de monetización no cuentan; por eso `porcentajeMonetizados` nunca supera 100 y puede diferir levemente de `GET /admin/monetizacion/resumen`, que cuenta todas las filas).
- **`ingresos.serie`:** tres fuentes. `ingresosCreditosSemana` suma montos de transacciones `compra_creditos` (recargas de créditos); `ingresosMensualidadSemana` suma montos de `activacion_plan` (cobro del plan mensual); `ingresosComisionesSemana` suma montos de `comision_servicio` (comisión 5% al completar, solo plan mensual). `ingresosTotalSemana` = las tres fuentes sumadas. Los montos de `cambio_modelo` **no** entran en ninguna fuente (el técnico ya pagó por `compra_creditos` o `activacion_plan` equivalente), por lo que los totales pueden diferir levemente de `GET /admin/monetizacion/resumen` (que sí cuenta `cambio_modelo`).
- **`adopcion.serie`:** `verificadosSemana` cuenta por `Tecnico.verificadoAt` (semana en que el admin aprobó/reactivo). `conModeloActivoSemana` = de esos verificados, cuántos hicieron su **primera** transacción de activación de modelo (`compra_creditos`/`activacion_plan`/`cambio_modelo`) **esa misma semana**. Las reactivaciones y compras repetidas no participan aquí.
- **`resumen.porcentajeMonetizados`** = (`totalConCreditos` + `totalConMensualidad`) / técnicos `verificado` × 100.
- **`resumen` ingresos:** `ingresosTotalesCreditos` (suma `compra_creditos`), `ingresosTotalesMensualidad` (suma `activacion_plan`), `ingresosTotalesComisiones` (suma `comision_servicio`) e `ingresosTotales` (las tres sumadas). Histórico completo, sin ventana.
- **`resumen.modeloMasElegido`** ∈ `creditos` | `mensualidad`: el modelo con más técnicos activos hoy; si no hay técnicos con modelo, es `null`.
- `ingresos*` son números decimales (montos `Decimal(10,2)` de transacciones; los pagos son simulados).
Estado: listo

### GET /admin/tecnicos
Lista los técnicos con búsqueda, filtros y orden. Todos los endpoints de esta sección requieren rol `admin`.
Auth: sí — `Authorization: Bearer <token>` (rol `admin`)
Query (opcional):
- `estado` ∈ `pendiente` | `en_revision` | `verificado` | `observado` | `rechazado` | `suspendido`
- `oficio` ∈ `gasfiteria` | `electricidad` | `carpinteria` | `albanileria` | `pintura`
- `nombre` — texto libre (máx. 100), busca en **nombre o correo** del técnico (case-insensitive)
- `orden` ∈ `recientes` (default) | `antiguos` | `experiencia` | `servicios` | `calificacion` | `nombre`
  - `recientes`/`antiguos`: por fecha de registro · `experiencia`: más años primero · `servicios`: más servicios completados · `calificacion`: mejor promedio · `nombre`: A–Z

Todos los filtros son combinables.
Ejemplos: `GET /admin/tecnicos?estado=en_revision&orden=antiguos` · `GET /admin/tecnicos?oficio=electricidad&nombre=juan`
Respuesta 200:
{ "data": { "tecnicos": [ { "id": 8, "estadoVerificacion": "en_revision", "oficio": "electricidad", "descripcion": null, "aniosExperiencia": 8, "distritos": ["trujillo"], "disponibilidad": [ { "dia": "lunes", "desde": "08:00", "hasta": "18:00" } ], "calificacionPromedio": null, "totalResenas": 0, "serviciosCompletados": 0, "documentosEnviadosAt": "2026-10-11T05:29:38.087Z", "createdAt": "2026-10-11T05:29:36.131Z", "usuario": { "id": 16, "email": "mario@mail.com", "nombre": "Mario Gómez" } } ] } }
Errores: 400 estado/oficio/orden/búsqueda inválidos · 401 no autenticado / token inválido · 403 no eres admin
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

### GET /admin/monetizacion/resumen
KPIs de monetización para las tarjetas del panel: técnicos con modelo, planes activos, créditos en circulación e ingresos.
"Ingresa" cuenta los montos de `compra_creditos`, `activacion_plan`, `cambio_modelo` y `comision_servicio` (los pagos son simulados).
Auth: sí — `Authorization: Bearer <token>` (rol `admin`)
Respuesta 200:
{ "data": { "tecnicos": { "total": 17, "conModelo": 5, "creditos": 3, "mensualidad": 2 }, "planesActivos": 2, "creditosEnCirculacion": 59, "ingresos": { "mes": 290, "total": 480 }, "transacciones": { "total": 20, "mes": 15 }, "generadoAt": "2026-10-23T05:00:00.000Z" } }
Errores: 401 no autenticado / token inválido · 403 no eres admin
Estado: listo

### GET /admin/monetizacion/tecnicos
Lista los técnicos con su modelo de monetización activo, créditos restantes y fecha de vencimiento del plan.
Auth: sí — `Authorization: Bearer <token>` (rol `admin`)
Query (opcional):
- `tipo` ∈ `creditos` | `mensualidad` — filtra por modelo activo
- `orden` ∈ `recientes` (default) | `creditos` | `vencimiento`
  - `recientes`: más recientes primero · `creditos`: más créditos primero · `vencimiento`: vencimiento más próximo primero
- `page` (default 1) · `limit` (default 20, tope 100)
Respuesta 200:
{ "data": { "tecnicos": [ { "id": 2, "nombre": "Jair Iglesias", "email": "jair.electricidad@trabajoya.com", "oficio": "electricidad", "monetizacion": { "id": 1, "tipo": "creditos", "creditosRestantes": 29, "planVenceAt": null, "paqueteId": "paq_10", "planId": null, "createdAt": "2026-10-23T03:06:14.335Z", "updatedAt": "2026-10-23T03:25:18.409Z" } } ], "paginacion": { "page": 1, "limit": 20, "total": 1, "total_paginas": 1 } } }
Errores: 400 filtro u orden inválidos · 401 no autenticado / token inválido · 403 no eres admin
Estado: listo

### GET /admin/monetizacion/transacciones
Lista todas las transacciones de monetización (compras de créditos, activaciones de plan, descuentos por aceptar, comisiones por completar, cambios de modelo).
Auth: sí — `Authorization: Bearer <token>` (rol `admin`)
Query (opcional):
- `tecnicoId` — filtra por técnico específico
- `tipoTransaccion` ∈ `compra_creditos` | `activacion_plan` | `descuento_credito` | `comision_servicio` | `cambio_modelo`
- `desde` / `hasta` — fechas ISO 8601
- `page` (default 1) · `limit` (default 20, tope 100)
Respuesta 200:
{ "data": { "transacciones": [ { "id": 12, "tipo": "descuento_credito", "monto": null, "creditos": -1, "descripcion": "Descuento de 1 crédito por aceptar solicitud", "referenciaId": "9", "createdAt": "2026-10-23T03:25:18.797Z", "tecnico": { "id": 2, "nombre": "Jair Iglesias", "email": "jair.electricidad@trabajoya.com" } } ], "paginacion": { "page": 1, "limit": 20, "total": 1, "total_paginas": 1 } } }
Errores: 400 filtros o paginación inválidos · 401 no autenticado / token inválido · 403 no eres admin
Estado: listo
