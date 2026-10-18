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

async function obtenerDashboard({ semanas_registros, semanas_cancelaciones, dias_reportes, limit_cola }) {
  const ahora = new Date();
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

  const verificadosNuevos7 = decisiones.filter(
    (d) => d.estadoNuevo === "verificado" && d.createdAt >= hace7,
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
  const decisionesVerificado = decisiones.filter((d) => d.estadoNuevo === "verificado");
  const conteosVerificados = repartirPorSemana(
    decisionesVerificado,
    semanasRegistros,
    (d) => d.createdAt,
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

  return {
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
  };
}

module.exports = { obtenerDashboard };
