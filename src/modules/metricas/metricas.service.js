const prisma = require("../../config/prisma");

const MS_DIA = 24 * 60 * 60 * 1000;
const MS_HORA = 60 * 60 * 1000;

const ESTADOS_VERIFICACION = [
  "pendiente",
  "en_revision",
  "verificado",
  "observado",
  "rechazado",
  "suspendido",
];

const OFICIOS = ["gasfiteria", "electricidad", "carpinteria", "albanileria", "pintura"];

const TIPOS_DOCUMENTO = [
  "dni_frente",
  "dni_reverso",
  "selfie",
  "cul",
  "certificado_oficio",
];

const ESTADOS_DECISION = ["verificado", "observado", "rechazado"];

const ESTADOS_SERVICIO = [
  "pendiente",
  "aceptado",
  "completado",
  "cancelado",
  "expirado",
  "rechazado",
];

const SEMANAS_COMPLETADAS = 8;

function inicioSemanaUTC(fecha) {
  const d = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d;
}

function serieSemanas(numSemanas) {
  const base = inicioSemanaUTC(new Date());
  const semanas = [];
  for (let i = numSemanas - 1; i >= 0; i -= 1) {
    const inicio = new Date(base.getTime() - i * 7 * MS_DIA);
    semanas.push({ inicio, fin: new Date(inicio.getTime() + 7 * MS_DIA) });
  }
  return semanas;
}

function inicioMesUTC(fecha) {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1));
}

function serieMeses(numMeses, mesFin) {
  const base = mesFin ? inicioMesUTC(mesFin) : inicioMesUTC(new Date());
  const meses = [];
  for (let i = numMeses - 1; i >= 0; i -= 1) {
    const inicio = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i, 1));
    const fin = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 1));
    meses.push({ inicio, fin, etiqueta: etiquetaMes(inicio) });
  }
  return meses;
}


function serieSemanasDelMes(mesFin) {
  const inicioMes = inicioMesUTC(mesFin);
  const finMes = new Date(Date.UTC(inicioMes.getUTCFullYear(), inicioMes.getUTCMonth() + 1, 1));
  const semanas = [];
  let cursor = new Date(inicioMes.getTime());
  while (cursor < finMes) {
    const fin = new Date(Math.min(cursor.getTime() + 7 * MS_DIA, finMes.getTime()));
    semanas.push({ inicio: new Date(cursor.getTime()), fin });
    cursor = new Date(fin.getTime());
  }
  return semanas;
}
function parseMes(mes) {
  if (!mes) return null;
  const [anio, mesNum] = mes.split("-").map(Number);
  return new Date(Date.UTC(anio, mesNum - 1, 1));
}

function etiquetaMes(fecha) {
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
}

function repartirPorMes(items, meses, obtenerFecha) {
  const conteos = new Array(meses.length).fill(0);
  for (const item of items) {
    const fecha = obtenerFecha(item);
    for (let i = 0; i < meses.length; i += 1) {
      if (fecha >= meses[i].inicio && fecha < meses[i].fin) {
        conteos[i] += 1;
        break;
      }
    }
  }
  return conteos;
}

function porcentaje(parte, total) {
  if (!total) {
    return 0;
  }
  return Math.round((parte / total) * 1000) / 10;
}

function redondear(valor, decimales = 1) {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

async function obtenerPrimerasDecisiones() {
  const filas = await prisma.historialVerificacion.findMany({
    where: { estadoNuevo: { in: ESTADOS_DECISION } },
    orderBy: { createdAt: "asc" },
    select: {
      tecnicoId: true,
      estadoNuevo: true,
      createdAt: true,
      tecnico: { select: { createdAt: true } },
    },
  });

  const primeras = new Map();
  for (const fila of filas) {
    if (!primeras.has(fila.tecnicoId)) {
      primeras.set(fila.tecnicoId, fila);
    }
  }
  return [...primeras.values()];
}

function repartirPorSemana(items, semanas, obtenerFecha) {
  const conteos = new Array(semanas.length).fill(0);
  for (const item of items) {
    const fecha = obtenerFecha(item);
    for (let i = 0; i < semanas.length; i += 1) {
      if (fecha >= semanas[i].inicio && fecha < semanas[i].fin) {
        conteos[i] += 1;
        break;
      }
    }
  }
  return conteos;
}

async function construirSeriesMensuales(numMeses, mesFin) {
  const meses = serieMeses(numMeses, mesFin);
  const desde = meses[0].inicio;

  const [tecnicos, verificados, servicios, clientesNuevos, resenas] =
    await Promise.all([
      prisma.tecnico.findMany({
        where: { createdAt: { gte: desde } },
        select: { createdAt: true },
      }),
      prisma.tecnico.findMany({
        where: { verificadoAt: { gte: desde } },
        select: { verificadoAt: true },
      }),
      prisma.servicio.findMany({
        where: { createdAt: { gte: desde } },
        select: { createdAt: true, estado: true },
      }),
      prisma.usuario.findMany({
        where: { rol: "cliente", createdAt: { gte: desde } },
        select: { createdAt: true },
      }),
      prisma.resena.findMany({
        where: { oculta: false, createdAt: { gte: desde } },
        select: { calificacion: true, createdAt: true },
      }),
    ]);

  const conteoEstadoPorMes = new Map(
    meses.map((mes) => [mes.etiqueta, new Map()]),
  );
  for (const servicio of servicios) {
    const etiqueta = etiquetaMes(servicio.createdAt);
    const conteo = conteoEstadoPorMes.get(etiqueta);
    if (conteo) {
      conteo.set(
        servicio.estado,
        (conteo.get(servicio.estado) ?? 0) + 1,
      );
    }
  }

  const conteosResenas = repartirPorMes(resenas, meses, (r) => r.createdAt);
  const calificacionesPorMes = new Map(meses.map((mes) => [mes.etiqueta, []]));
  for (const resena of resenas) {
    const acumulado = calificacionesPorMes.get(etiquetaMes(resena.createdAt));
    if (acumulado) {
      acumulado.push(resena.calificacion);
    }
  }

  const serie = meses.map((mes, i) => {
    const conteo = conteoEstadoPorMes.get(mes.etiqueta);
    const totalServicios = conteo ? [...conteo.values()].reduce((a, b) => a + b, 0) : 0;
    const completados = conteo?.get("completado") ?? 0;
    const calificaciones = calificacionesPorMes.get(mes.etiqueta);

    return {
      mes: mes.etiqueta,
      registros: 0,
      verificados: 0,
      servicios: totalServicios,
      completados,
      cancelados: conteo?.get("cancelado") ?? 0,
      expirados: conteo?.get("expirado") ?? 0,
      rechazados: conteo?.get("rechazado") ?? 0,
      tasaConversion: totalServicios ? porcentaje(completados, totalServicios) : 0,
      cancelacionesTardias: 0,
      clientesNuevos: 0,
      resenas: conteosResenas[i],
      calificacionPromedio: calificaciones.length
        ? redondear(
            calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length,
            2,
          )
        : 0,
    };
  });

  const conteosRegistros = repartirPorMes(tecnicos, meses, (t) => t.createdAt);
  conteosRegistros.forEach((total, i) => {
    serie[i].registros = total;
  });
  const conteosVerificados = repartirPorMes(verificados, meses, (t) => t.verificadoAt);
  conteosVerificados.forEach((total, i) => {
    serie[i].verificados = total;
  });

  const cancelaciones = await prisma.servicio.findMany({
    where: { cancelacionTardia: true, canceladoAt: { gte: desde } },
    select: { canceladoAt: true },
  });
  const conteosCancela = repartirPorMes(cancelaciones, meses, (s) => s.canceladoAt);
  conteosCancela.forEach((total, i) => {
    serie[i].cancelacionesTardias = total;
  });

  const conteosClientes = repartirPorMes(clientesNuevos, meses, (u) => u.createdAt);
  conteosClientes.forEach((total, i) => {
    serie[i].clientesNuevos = total;
  });

  return { meses: meses.length, serie };
}

async function construirMarketplace(ahora) {
  const hace7 = new Date(ahora.getTime() - 7 * MS_DIA);
  const hace30 = new Date(ahora.getTime() - 30 * MS_DIA);
  const semanas = serieSemanas(SEMANAS_COMPLETADAS);
  const inicioSerie = semanas[0].inicio;

  const [
    porEstado,
    totalServicios,
    tiemposFilas,
    completadasSerie,
    clientesTotal,
    clientesNuevos7,
    clientesConSolicitud30,
    completadasPorCliente,
    califPromedio,
    completadosTotal,
    completadosConResena,
    distribucionCalif,
    verificadosTotal,
    tecnicosConServicio30,
    topTecnicosRaw,
  ] = await Promise.all([
    prisma.servicio.groupBy({ by: ["estado"], _count: { _all: true } }),
    prisma.servicio.count(),
    prisma.servicio.findMany({
      where: { aceptadoAt: { not: null } },
      select: { createdAt: true, aceptadoAt: true, completadoAt: true },
    }),
    prisma.servicio.findMany({
      where: { estado: "completado", completadoAt: { gte: inicioSerie } },
      select: { completadoAt: true },
    }),
    prisma.usuario.count({ where: { rol: "cliente" } }),
    prisma.usuario.count({ where: { rol: "cliente", createdAt: { gte: hace7 } } }),
    prisma.servicio.findMany({
      where: { createdAt: { gte: hace30 } },
      select: { clienteId: true },
      distinct: ["clienteId"],
    }),
    prisma.servicio.groupBy({
      by: ["clienteId"],
      where: { estado: "completado" },
      _count: { _all: true },
    }),
    prisma.resena.aggregate({
      where: { oculta: false },
      _avg: { calificacion: true },
    }),
    prisma.servicio.count({ where: { estado: "completado" } }),
    prisma.servicio.count({
      where: { estado: "completado", resena: { isNot: null } },
    }),
    prisma.resena.groupBy({
      by: ["calificacion"],
      where: { oculta: false },
      _count: { _all: true },
    }),
    prisma.tecnico.count({ where: { estadoVerificacion: "verificado" } }),
    prisma.servicio.findMany({
      where: { createdAt: { gte: hace30 } },
      select: { tecnicoId: true },
      distinct: ["tecnicoId"],
    }),
    prisma.tecnico.findMany({
      where: { serviciosCompletados: { gt: 0 } },
      orderBy: [{ serviciosCompletados: "desc" }, { id: "asc" }],
      take: 5,
      select: {
        id: true,
        serviciosCompletados: true,
        usuario: { select: { nombre: true } },
      },
    }),
  ]);

  const conteoEstado = new Map(porEstado.map((fila) => [fila.estado, fila._count._all]));

  const tiemposHastaAceptacion = [];
  const tiemposHastaCompletado = [];
  for (const fila of tiemposFilas) {
    tiemposHastaAceptacion.push(
      (fila.aceptadoAt.getTime() - fila.createdAt.getTime()) / MS_HORA,
    );
    if (fila.completadoAt) {
      tiemposHastaCompletado.push(
        (fila.completadoAt.getTime() - fila.aceptadoAt.getTime()) / MS_HORA,
      );
    }
  }

  const promedio = (valores) =>
    valores.length ? redondear(valores.reduce((a, b) => a + b, 0) / valores.length) : null;

  const conteosCompletadas = repartirPorSemana(completadasSerie, semanas, (s) => s.completadoAt);

  const clientesCon1 = completadasPorCliente.length;
  const clientesCon2Mas = completadasPorCliente.filter(
    (fila) => fila._count._all >= 2,
  ).length;

  const conteoCalif = new Map(distribucionCalif.map((fila) => [fila.calificacion, fila._count._all]));

  return {
    servicios: {
      total: totalServicios,
      porEstado: ESTADOS_SERVICIO.map((estado) => {
        const total = conteoEstado.get(estado) ?? 0;
        return { estado, total, porcentaje: porcentaje(total, totalServicios) };
      }),
      tasaConversionCompletado: porcentaje(completadosTotal, totalServicios),
      evolucionCompletadasSemanal: {
        semanas: SEMANAS_COMPLETADAS,
        serie: semanas.map((semana, i) => ({
          semanaInicio: semana.inicio,
          completadas: conteosCompletadas[i],
        })),
      },
      tiempoPromedioSolicitudAAceptacionHoras: promedio(tiemposHastaAceptacion),
      tiempoPromedioAceptacionACompletadoHoras: promedio(tiemposHastaCompletado),
    },
    clientes: {
      total: clientesTotal,
      nuevosEstaSemana: clientesNuevos7,
      activos30Dias: clientesConSolicitud30.length,
      retencionDosOMasCompletados: porcentaje(clientesCon2Mas, clientesCon1),
    },
    calidad: {
      calificacionPromedioGeneral:
        califPromedio._avg.calificacion === null
          ? null
          : redondear(califPromedio._avg.calificacion, 2),
      tasaResenas: porcentaje(completadosConResena, completadosTotal),
      distribucionCalificaciones: [5, 4, 3, 2, 1].map((estrellas) => ({
        estrellas,
        total: conteoCalif.get(estrellas) ?? 0,
      })),
    },
    tecnicosActivos: {
      porcentajeVerificadosConServicio30Dias: porcentaje(
        tecnicosConServicio30.length,
        verificadosTotal,
      ),
      top5: topTecnicosRaw.map((t) => ({
        id: t.id,
        nombre: t.usuario.nombre,
        total: t.serviciosCompletados,
      })),
    },
  };
}


async function construirSemanalDelMesDashboard(mesFin) {
  const semanas = serieSemanasDelMes(mesFin);
  const desde = semanas[0].inicio;
  const hasta = semanas[semanas.length - 1].fin;

  const [tecnicos, verificados, servicios, clientesNuevos, resenas, cancelaciones] =
    await Promise.all([
      prisma.tecnico.findMany({ where: { createdAt: { gte: desde, lt: hasta } }, select: { createdAt: true } }),
      prisma.tecnico.findMany({ where: { verificadoAt: { gte: desde, lt: hasta } }, select: { verificadoAt: true } }),
      prisma.servicio.findMany({ where: { createdAt: { gte: desde, lt: hasta } }, select: { createdAt: true, estado: true } }),
      prisma.usuario.findMany({ where: { rol: "cliente", createdAt: { gte: desde, lt: hasta } }, select: { createdAt: true } }),
      prisma.resena.findMany({ where: { oculta: false, createdAt: { gte: desde, lt: hasta } }, select: { calificacion: true, createdAt: true } }),
      prisma.servicio.findMany({ where: { cancelacionTardia: true, canceladoAt: { gte: desde, lt: hasta } }, select: { canceladoAt: true } }),
    ]);

  const repartir = (items, obtenerFecha) => {
    const conteos = new Array(semanas.length).fill(0);
    for (const item of items) {
      const fecha = obtenerFecha(item);
      for (let i = 0; i < semanas.length; i += 1) {
        if (fecha >= semanas[i].inicio && fecha < semanas[i].fin) { conteos[i] += 1; break; }
      }
    }
    return conteos;
  };

  const conteosServicios = new Array(semanas.length).fill(0).map(() => ({}));
  for (const servicio of servicios) {
    for (let i = 0; i < semanas.length; i += 1) {
      if (servicio.createdAt >= semanas[i].inicio && servicio.createdAt < semanas[i].fin) {
        conteosServicios[i][servicio.estado] = (conteosServicios[i][servicio.estado] ?? 0) + 1;
        break;
      }
    }
  }

  const calificacionesPorSemana = semanas.map(() => []);
  for (const resena of resenas) {
    for (let i = 0; i < semanas.length; i += 1) {
      if (resena.createdAt >= semanas[i].inicio && resena.createdAt < semanas[i].fin) {
        calificacionesPorSemana[i].push(resena.calificacion);
        break;
      }
    }
  }

  const serie = semanas.map((semana, i) => {
    const conteo = conteosServicios[i];
    const totalServicios = Object.values(conteo).reduce((a, b) => a + b, 0);
    const completados = conteo.completado ?? 0;
    const calificaciones = calificacionesPorSemana[i];
    return {
      semanaInicio: semana.inicio.toISOString(),
      registrosNuevos: 0,
      verificados: 0,
      servicios: totalServicios,
      completados,
      cancelados: conteo.cancelado ?? 0,
      expirados: conteo.expirado ?? 0,
      rechazados: conteo.rechazado ?? 0,
      tasaConversion: totalServicios ? porcentaje(completados, totalServicios) : 0,
      cancelacionesTardias: 0,
      clientesNuevos: 0,
      resenas: 0,
      calificacionPromedio: calificaciones.length
        ? redondear(calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length, 2)
        : 0,
    };
  });

  const rRegistros = repartir(tecnicos, (t) => t.createdAt);
  const rVerificados = repartir(verificados, (t) => t.verificadoAt);
  const rCancela = repartir(cancelaciones, (s) => s.canceladoAt);
  const rClientes = repartir(clientesNuevos, (u) => u.createdAt);
  const rResenas = repartir(resenas, (r) => r.createdAt);

  rRegistros.forEach((v, i) => { serie[i].registrosNuevos = v; });
  rVerificados.forEach((v, i) => { serie[i].verificados = v; });
  rCancela.forEach((v, i) => { serie[i].cancelacionesTardias = v; });
  rClientes.forEach((v, i) => { serie[i].clientesNuevos = v; });
  rResenas.forEach((v, i) => { serie[i].resenas = v; });

  return { semanas: semanas.length, serie };
}
async function obtenerDashboard({
  semanas_registros,
  semanas_cancelaciones,
  dias_reportes,
  limit_cola,
  meses,
  mes,
}) {
  const ahora = new Date();
  const mesFin = parseMes(mes);
  const numMeses = meses || 12;
  const promesaMensuales = (mes || meses)
    ? construirSeriesMensuales(numMeses, mesFin || undefined)
    : null;
  const promesaSemanalDelMes = mes && mesFin
    ? construirSemanalDelMesDashboard(mesFin)
    : null;
  const promesaMarketplace = construirMarketplace(ahora);
  const hace7 = new Date(ahora.getTime() - 7 * MS_DIA);
  const hace14 = new Date(ahora.getTime() - 14 * MS_DIA);
  const hace48h = new Date(ahora.getTime() - 2 * MS_DIA);
  const hace30 = new Date(ahora.getTime() - 30 * MS_DIA);
  const hace60 = new Date(ahora.getTime() - 60 * MS_DIA);
  const desdeReportes = new Date(ahora.getTime() - dias_reportes * MS_DIA);

  const semanasRegistros = serieSemanas(semanas_registros);
  const semanasCancelaciones = serieSemanas(semanas_cancelaciones);

  const [
    reportesPendientes,
    reportesNuevos7,
    reportesPrev7,
    reportesMas48,
    tecnicosTotal,
    tecnicosNuevos7,
    verificadosTotal,
    enRevisionTotal,
    enRevisionNuevos7,
    enRevisionPrev7,
    porEstado,
    porOficio,
    porMotivo,
    revisionParaPrioridad,
    colaRaw,
    tecnicosFechas,
    tecnicosVerificados,
    cancelaciones,
    decisiones,
  ] = await Promise.all([
    prisma.reporte.count({ where: { estado: "pendiente" } }),
    prisma.reporte.count({ where: { createdAt: { gte: hace7 } } }),
    prisma.reporte.count({ where: { createdAt: { gte: hace14, lt: hace7 } } }),
    prisma.reporte.count({ where: { estado: "pendiente", createdAt: { lt: hace48h } } }),
    prisma.tecnico.count(),
    prisma.tecnico.count({ where: { createdAt: { gte: hace7 } } }),
    prisma.tecnico.count({ where: { estadoVerificacion: "verificado" } }),
    prisma.tecnico.count({ where: { estadoVerificacion: "en_revision" } }),
    prisma.tecnico.count({ where: { documentosEnviadosAt: { gte: hace7 } } }),
    prisma.tecnico.count({ where: { documentosEnviadosAt: { gte: hace14, lt: hace7 } } }),
    prisma.tecnico.groupBy({ by: ["estadoVerificacion"], _count: { _all: true } }),
    prisma.tecnico.groupBy({
      by: ["oficio"],
      where: { oficio: { not: null } },
      _count: { _all: true },
    }),
    prisma.reporte.groupBy({
      by: ["categoria"],
      where: { createdAt: { gte: desdeReportes } },
      _count: { _all: true },
    }),
    prisma.tecnico.findMany({
      where: { estadoVerificacion: "en_revision" },
      select: { documentosEnviadosAt: true, createdAt: true },
    }),
    prisma.tecnico.findMany({
      where: { estadoVerificacion: "en_revision" },
      orderBy: [{ documentosEnviadosAt: "asc" }, { createdAt: "asc" }],
      take: limit_cola,
      select: {
        id: true,
        oficio: true,
        distritos: true,
        documentosEnviadosAt: true,
        createdAt: true,
        usuario: { select: { nombre: true } },
        documentos: { select: { tipo: true } },
      },
    }),
    prisma.tecnico.findMany({
      where: { createdAt: { gte: semanasRegistros[0].inicio } },
      select: { createdAt: true },
    }),
    prisma.tecnico.findMany({
      where: { verificadoAt: { gte: semanasRegistros[0].inicio } },
      select: { verificadoAt: true },
    }),
    prisma.servicio.findMany({
      where: { cancelacionTardia: true, canceladoAt: { gte: semanasCancelaciones[0].inicio } },
      select: { canceladoAt: true },
    }),
    obtenerPrimerasDecisiones(),
  ]);

  const masAntiguoDias = revisionParaPrioridad.reduce((max, tecnico) => {
    const desde = tecnico.documentosEnviadosAt ?? tecnico.createdAt;
    const dias = Math.floor((ahora.getTime() - desde.getTime()) / MS_DIA);
    return Math.max(max, dias);
  }, 0);

  const verificadosNuevos7 = tecnicosVerificados.filter(
    (t) => t.verificadoAt >= hace7,
  ).length;

  const conteoEstado = new Map(porEstado.map((fila) => [fila.estadoVerificacion, fila._count._all]));
  const tecnicosPorEstado = {
    total: tecnicosTotal,
    estados: ESTADOS_VERIFICACION.map((estado) => {
      const total = conteoEstado.get(estado) ?? 0;
      return { estado, total, porcentaje: porcentaje(total, tecnicosTotal) };
    }),
  };

  const conteoOficio = new Map(porOficio.map((fila) => [fila.oficio, fila._count._all]));
  const tecnicosPorOficio = {
    total: tecnicosTotal,
    oficios: OFICIOS.map((oficio) => {
      const total = conteoOficio.get(oficio) ?? 0;
      return { oficio, total, porcentaje: porcentaje(total, tecnicosTotal) };
    }).sort((a, b) => b.total - a.total),
  };

  const totalMotivos = porMotivo.reduce((suma, fila) => suma + fila._count._all, 0);
  const reportesPorMotivo = {
    dias: dias_reportes,
    total: totalMotivos,
    motivos: porMotivo
      .map((fila) => ({
        categoria: fila.categoria,
        total: fila._count._all,
        porcentaje: porcentaje(fila._count._all, totalMotivos),
      }))
      .sort((a, b) => b.total - a.total),
  };

  const conteosRegistros = repartirPorSemana(tecnicosFechas, semanasRegistros, (t) => t.createdAt);
  const conteosVerificados = repartirPorSemana(
    tecnicosVerificados,
    semanasRegistros,
    (t) => t.verificadoAt,
  );
  const registrosVerificaciones = {
    semanas: semanas_registros,
    serie: semanasRegistros.map((semana, i) => ({
      semanaInicio: semana.inicio,
      registrosNuevos: conteosRegistros[i],
      verificados: conteosVerificados[i],
    })),
  };

  const conteosCancelaciones = repartirPorSemana(
    cancelaciones,
    semanasCancelaciones,
    (s) => s.canceladoAt,
  );
  const cancelacionesTardiasSemanales = {
    semanas: semanas_cancelaciones,
    serie: semanasCancelaciones.map((semana, i) => ({
      semanaInicio: semana.inicio,
      total: conteosCancelaciones[i],
    })),
    pico: conteosCancelaciones.reduce((max, n) => Math.max(max, n), 0),
  };

  const tiempos = decisiones.map((d) => ({
    fecha: d.createdAt,
    horas: (d.createdAt.getTime() - d.tecnico.createdAt.getTime()) / MS_HORA,
  }));
  const promedioHoras = tiempos.length
    ? redondear(tiempos.reduce((suma, t) => suma + t.horas, 0) / tiempos.length)
    : null;
  const tiemposUltimos30 = tiempos.filter((t) => t.fecha >= hace30);
  const tiemposPrevios30 = tiempos.filter((t) => t.fecha >= hace60 && t.fecha < hace30);
  const promedioUltimos30 = tiemposUltimos30.length
    ? tiemposUltimos30.reduce((suma, t) => suma + t.horas, 0) / tiemposUltimos30.length
    : null;
  const promedioPrevios30 = tiemposPrevios30.length
    ? tiemposPrevios30.reduce((suma, t) => suma + t.horas, 0) / tiemposPrevios30.length
    : null;
  const vsMesPasadoPorcentaje =
    promedioUltimos30 !== null && promedioPrevios30
      ? redondear(((promedioUltimos30 - promedioPrevios30) / promedioPrevios30) * 100)
      : null;

  const colaRevision = {
    tecnicos: colaRaw.map((t) => {
      const presentes = new Set(t.documentos.map((documento) => documento.tipo));
      const faltantes = TIPOS_DOCUMENTO.filter((tipo) => !presentes.has(tipo));
      const desde = t.documentosEnviadosAt ?? t.createdAt;
      return {
        id: t.id,
        nombre: t.usuario.nombre,
        oficio: t.oficio,
        distrito: t.distritos[0] ?? null,
        diasEsperando: Math.floor((ahora.getTime() - desde.getTime()) / MS_DIA),
        estadoDocumentos: faltantes.length ? "faltan" : "completos",
        faltantes,
        documentosEnviadosAt: t.documentosEnviadosAt,
      };
    }),
  };

  const marketplace = await promesaMarketplace;
  const seriesMensuales = promesaMensuales ? await promesaMensuales : null;
  const semanalDelMes = promesaSemanalDelMes ? await promesaSemanalDelMes : null;
  const devuelto = {
    generadoEn: ahora,
    prioridadHoy: {
      tecnicosEnEspera: enRevisionTotal,
      masAntiguoDias,
    },
    tarjetas: {
      reportesAbiertos: {
        total: reportesPendientes,
        vsSemanaPasada: reportesNuevos7 - reportesPrev7,
        masDe48h: reportesMas48,
      },
      tecnicosTotales: {
        total: tecnicosTotal,
        nuevosSemana: tecnicosNuevos7,
      },
      verificados: {
        total: verificadosTotal,
        nuevosSemana: verificadosNuevos7,
        porcentajeDelTotal: porcentaje(verificadosTotal, tecnicosTotal),
      },
      enRevision: {
        total: enRevisionTotal,
        vsSemanaPasada: enRevisionNuevos7 - enRevisionPrev7,
      },
    },
    registrosVerificaciones,
    tecnicosPorEstado,
    reportesPorMotivo,
    cancelacionesTardiasSemanales,
    tecnicosPorOficio,
    tiempoVerificacion: {
      promedioHoras,
      vsMesPasadoPorcentaje,
    },
    colaRevision,
    marketplace,
    ...(seriesMensuales
      ? {
          seriesMensuales,
          periodo: {
            seleccionado:
              mes || seriesMensuales.serie[seriesMensuales.serie.length - 1].mes,
            anterior:
              seriesMensuales.serie.length > 1
                ? seriesMensuales.serie[seriesMensuales.serie.length - 2].mes
                : null,
          },
        }
      : {}),
    ...(semanalDelMes ? { semanalDelMes } : {}),
  };
  return devuelto;
}

async function construirMonetizacion({ semanas, meses: mesesParam, mes }) {
  const ahora = new Date();
  const serie = serieSemanas(semanas);
  const mesFin = parseMes(mes);

  const modelosCambio = ["compra_creditos", "activacion_plan", "cambio_modelo"];

  const [transacciones, tecnicosVerificados, monetizaciones, ingresosAgregados] =
    await Promise.all([
      prisma.transaccionMonetizacion.findMany({
        orderBy: { createdAt: "asc" },
        select: {
          tecnicoId: true,
          tipo: true,
          referenciaId: true,
          monto: true,
          createdAt: true,
        },
      }),
      prisma.tecnico.findMany({
        where: { estadoVerificacion: "verificado" },
        select: { id: true, verificadoAt: true },
      }),
      prisma.monetizacionTecnico.findMany({
        where: { tipo: { not: null } },
        select: { tecnicoId: true, tipo: true },
      }),
      prisma.transaccionMonetizacion.groupBy({
        by: ["tipo"],
        _sum: { monto: true },
        where: { tipo: { in: ["compra_creditos", "activacion_plan", "comision_servicio"] } },
      }),
    ]);

  const transaccionesPorTecnico = new Map();
  for (const fila of transacciones) {
    if (!transaccionesPorTecnico.has(fila.tecnicoId)) {
      transaccionesPorTecnico.set(fila.tecnicoId, []);
    }
    transaccionesPorTecnico.get(fila.tecnicoId).push(fila);
  }

  function designacion(fila) {
    if (fila.tipo === "compra_creditos") {
      return "creditos";
    }
    if (fila.tipo === "activacion_plan") {
      return "mensualidad";
    }
    if (fila.tipo === "cambio_modelo") {
      return fila.referenciaId === "plan_mensual" ? "mensualidad" : "creditos";
    }
    return null;
  }

  const primeraActiva = new Map();
  for (const [tecnicoId, filas] of transaccionesPorTecnico) {
    for (const fila of filas) {
      if (modelosCambio.includes(fila.tipo)) {
        primeraActiva.set(tecnicoId, fila.createdAt);
        break;
      }
    }
  }

  function modeloSemana(tecnicoId, finSemana) {
    let modelo = null;
    for (const fila of transaccionesPorTecnico.get(tecnicoId) ?? []) {
      if (fila.createdAt >= finSemana) {
        break;
      }
      const hacia = designacion(fila);
      if (hacia) {
        modelo = hacia;
      }
    }
    return modelo;
  }

  const modelosActivosSerie = serie.map((semana) => {
    const conteos = { creditos: 0, mensualidad: 0 };
    for (const tecnicoId of transaccionesPorTecnico.keys()) {
      const modelo = modeloSemana(tecnicoId, semana.fin);
      if (modelo) {
        conteos[modelo] += 1;
      }
    }
    return {
      semanaInicio: semana.inicio,
      creditos: conteos.creditos,
      mensualidad: conteos.mensualidad,
    };
  });

  const ingresosSerie = serie.map((semana) => {
    const porSemana = { creditos: 0, mensualidad: 0, comisiones: 0 };
    for (const fila of transacciones) {
      if (
        fila.createdAt >= semana.inicio &&
        fila.createdAt < semana.fin &&
        fila.monto !== null
      ) {
        if (fila.tipo === "compra_creditos") {
          porSemana.creditos += Number(fila.monto);
        } else if (fila.tipo === "activacion_plan") {
          porSemana.mensualidad += Number(fila.monto);
        } else if (fila.tipo === "comision_servicio") {
          porSemana.comisiones += Number(fila.monto);
        }
      }
    }
    return {
      semanaInicio: semana.inicio,
      ingresosCreditosSemana: redondear(porSemana.creditos, 2),
      ingresosMensualidadSemana: redondear(porSemana.mensualidad, 2),
      ingresosComisionesSemana: redondear(porSemana.comisiones, 2),
      ingresosTotalSemana: redondear(
        porSemana.creditos + porSemana.mensualidad + porSemana.comisiones,
        2,
      ),
    };
  });

  const adopcionSerie = serie.map((semana) => {
    const verificadosSemana = tecnicosVerificados.filter(
      (t) => t.verificadoAt >= semana.inicio && t.verificadoAt < semana.fin,
    ).length;
    const conModeloActivoSemana = tecnicosVerificados.filter(
      (t) =>
        t.verificadoAt >= semana.inicio &&
        t.verificadoAt < semana.fin &&
        primeraActiva.get(t.id) !== undefined &&
        primeraActiva.get(t.id) >= semana.inicio &&
        primeraActiva.get(t.id) < semana.fin,
    ).length;
    return { semanaInicio: semana.inicio, verificadosSemana, conModeloActivoSemana };
  });

  const idsVerificados = new Set(tecnicosVerificados.map((t) => t.id));
  const monetizacionesDeVerificados = monetizaciones.filter((m) => idsVerificados.has(m.tecnicoId));

  const totalConCreditos = monetizacionesDeVerificados.filter((m) => m.tipo === "creditos").length;
  const totalConMensualidad = monetizacionesDeVerificados.filter(
    (m) => m.tipo === "mensualidad",
  ).length;
  const verificadosTotal = tecnicosVerificados.length;
  const conModelo = totalConCreditos + totalConMensualidad;

  const ingresosTotales = { compra_creditos: 0, activacion_plan: 0, comision_servicio: 0 };
  for (const fila of ingresosAgregados) {
    ingresosTotales[fila.tipo] = redondear(Number(fila._sum.monto ?? 0), 2);
  }

  const modeloMasElegido =
    totalConMensualidad > totalConCreditos
      ? "mensualidad"
      : totalConCreditos > 0
        ? "creditos"
        : null;

  const devuelto = {
    generadoEn: ahora,
    modelosActivos: {
      totales: {
        creditos: totalConCreditos,
        mensualidad: totalConMensualidad,
        ninguno: Math.max(verificadosTotal - conModelo, 0),
      },
      serie: modelosActivosSerie,
    },
    ingresos: { serie: ingresosSerie },
    adopcion: { serie: adopcionSerie },
    resumen: {
      totalConCreditos,
      totalConMensualidad,
      totalSinModelo: Math.max(verificadosTotal - conModelo, 0),
      ingresosTotalesCreditos: ingresosTotales.compra_creditos,
      ingresosTotalesMensualidad: ingresosTotales.activacion_plan,
      ingresosTotalesComisiones: ingresosTotales.comision_servicio,
      ingresosTotales: redondear(
        ingresosTotales.compra_creditos +
          ingresosTotales.activacion_plan +
          ingresosTotales.comision_servicio,
        2,
      ),
      modeloMasElegido,
      porcentajeMonetizados: porcentaje(conModelo, verificadosTotal),
    },
  };

  if (mesesParam || mes) {
    const numMeses = mesesParam || 12;
    const meses = serieMeses(numMeses, mesFin || undefined);

    const serieIngresos = meses.map((mes) => {
      const porMes = { creditos: 0, mensualidad: 0, comisiones: 0 };
      for (const fila of transacciones) {
        if (
          fila.createdAt >= mes.inicio &&
          fila.createdAt < mes.fin &&
          fila.monto !== null
        ) {
          if (fila.tipo === "compra_creditos") {
            porMes.creditos += Number(fila.monto);
          } else if (fila.tipo === "activacion_plan") {
            porMes.mensualidad += Number(fila.monto);
          } else if (fila.tipo === "comision_servicio") {
            porMes.comisiones += Number(fila.monto);
          }
        }
      }
      return {
        mes: mes.etiqueta,
        ingresosCreditosMes: redondear(porMes.creditos, 2),
        ingresosMensualidadMes: redondear(porMes.mensualidad, 2),
        ingresosComisionesMes: redondear(porMes.comisiones, 2),
        ingresosTotalMes: redondear(
          porMes.creditos + porMes.mensualidad + porMes.comisiones,
          2,
        ),
      };
    });

    const serieModelos = meses.map((mes) => {
      const conteos = { creditos: 0, mensualidad: 0 };
      for (const tecnicoId of transaccionesPorTecnico.keys()) {
        const modelo = modeloSemana(tecnicoId, mes.fin);
        if (modelo) {
          conteos[modelo] += 1;
        }
      }
      return {
        mes: mes.etiqueta,
        creditos: conteos.creditos,
        mensualidad: conteos.mensualidad,
      };
    });

    devuelto.ingresosMensuales = { meses: meses.length, serie: serieIngresos };
    devuelto.modelosMensuales = { meses: meses.length, serie: serieModelos };
    devuelto.periodo = {
      seleccionado: meses[meses.length - 1].etiqueta,
      anterior: meses.length > 1 ? meses[meses.length - 2].etiqueta : null,
    };
  }

  if (mes && mesFin) {
    devuelto.semanalDelMes = await construirSemanalDelMesMonetizacion(
      mesFin,
      transacciones,
      transaccionesPorTecnico,
    );
  }

  return devuelto;
}


async function construirSemanalDelMesMonetizacion(mesFin, transacciones, transaccionesPorTecnico) {
  const semanas = serieSemanasDelMes(mesFin);
  const modeloSemana = (tecnicoId, fechaCierre) => {
    let modelo = null;
    let fechaUltima = null;
    for (const fila of transaccionesPorTecnico.get(tecnicoId) ?? []) {
      if (fila.createdAt > fechaCierre) break;
      if (fila.tipo === "compra_creditos" || (fila.tipo === "cambio_modelo" && fila.referenciaId === "creditos")) {
        if (!fechaUltima || fila.createdAt > fechaUltima) { modelo = "creditos"; fechaUltima = fila.createdAt; }
      } else if (fila.tipo === "activacion_plan" || (fila.tipo === "cambio_modelo" && fila.referenciaId === "plan_mensual")) {
        if (!fechaUltima || fila.createdAt > fechaUltima) { modelo = "mensualidad"; fechaUltima = fila.createdAt; }
      }
    }
    return modelo;
  };

  const ingresosSerie = semanas.map((semana) => {
    const porSemana = { creditos: 0, mensualidad: 0, comisiones: 0 };
    for (const fila of transacciones) {
      if (fila.createdAt >= semana.inicio && fila.createdAt < semana.fin && fila.monto !== null) {
        if (fila.tipo === "compra_creditos") porSemana.creditos += Number(fila.monto);
        else if (fila.tipo === "activacion_plan") porSemana.mensualidad += Number(fila.monto);
        else if (fila.tipo === "comision_servicio") porSemana.comisiones += Number(fila.monto);
      }
    }
    return {
      semanaInicio: semana.inicio.toISOString(),
      ingresosCreditosSemana: redondear(porSemana.creditos, 2),
      ingresosMensualidadSemana: redondear(porSemana.mensualidad, 2),
      ingresosComisionesSemana: redondear(porSemana.comisiones, 2),
      ingresosTotalSemana: redondear(porSemana.creditos + porSemana.mensualidad + porSemana.comisiones, 2),
    };
  });

  const modelosSerie = semanas.map((semana) => {
    const conteos = { creditos: 0, mensualidad: 0 };
    for (const tecnicoId of transaccionesPorTecnico.keys()) {
      const modelo = modeloSemana(tecnicoId, semana.fin);
      if (modelo) conteos[modelo] += 1;
    }
    return { semanaInicio: semana.inicio.toISOString(), creditos: conteos.creditos, mensualidad: conteos.mensualidad };
  });

  return { semanas: semanas.length, ingresos: { serie: ingresosSerie }, modelos: { serie: modelosSerie } };
}
async function obtenerMonetizacion(query) {
  return construirMonetizacion(query);
}

module.exports = { obtenerDashboard, obtenerMonetizacion };
