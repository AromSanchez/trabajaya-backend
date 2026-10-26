const prisma = require("../../config/prisma");
const ApiError = require("../../config/ApiError");

const LIMITE_POR_DEFECTO = 20;
const LIMITE_MAXIMO = 100;

const TECNICO_MONETIZACION_SELECT = {
  id: true,
  oficio: true,
  usuario: { select: { id: true, email: true, nombre: true } },
  monetizacion: {
    select: {
      id: true,
      tipo: true,
      creditosRestantes: true,
      planVenceAt: true,
      paqueteId: true,
      planId: true,
      createdAt: true,
      updatedAt: true,
    },
  },
};

async function listarTecnicosMonetizacion({ tipo, orden, page = 1, limit } = {}) {
  const limiteFinal = Math.min(limit ?? LIMITE_POR_DEFECTO, LIMITE_MAXIMO);

  const where = {};
  if (tipo === "con_modelo") {
    where.monetizacion = { tipo: { in: ["creditos", "mensualidad"] } };
  } else if (tipo === "sin_modelo") {
    where.OR = [
      { monetizacion: null },
      { monetizacion: { tipo: null } },
    ];
  } else if (tipo) {
    where.monetizacion = { tipo };
  }

  let orderBy;
  switch (orden) {
    case "creditos":
      orderBy = { monetizacion: { creditosRestantes: "desc" } };
      break;
    case "vencimiento":
      orderBy = { monetizacion: { planVenceAt: "asc" } };
      break;
    case "recientes":
    default:
      orderBy = { createdAt: "desc" };
      break;
  }

  const [total, tecnicos] = await prisma.$transaction([
    prisma.tecnico.count({ where }),
    prisma.tecnico.findMany({
      where,
      orderBy,
      skip: (page - 1) * limiteFinal,
      take: limiteFinal,
      select: TECNICO_MONETIZACION_SELECT,
    }),
  ]);

  return {
    tecnicos: tecnicos.map((t) => ({
      id: t.id,
      nombre: t.usuario.nombre,
      email: t.usuario.email,
      oficio: t.oficio,
      monetizacion: t.monetizacion
        ? {
            id: t.monetizacion.id,
            tipo: t.monetizacion.tipo,
            creditosRestantes: t.monetizacion.creditosRestantes,
            planVenceAt: t.monetizacion.planVenceAt?.toISOString() ?? null,
            paqueteId: t.monetizacion.paqueteId,
            planId: t.monetizacion.planId,
            createdAt: t.monetizacion.createdAt.toISOString(),
            updatedAt: t.monetizacion.updatedAt.toISOString(),
          }
        : { tipo: null, creditosRestantes: 0, planVenceAt: null, paqueteId: null, planId: null },
    })),
    paginacion: {
      page,
      limit: limiteFinal,
      total,
      total_paginas: Math.ceil(total / limiteFinal),
    },
  };
}

async function listarTransaccionesMonetizacion({ tecnicoId, tipoTransaccion, desde, hasta, page = 1, limit } = {}) {
  const limiteFinal = Math.min(limit ?? LIMITE_POR_DEFECTO, LIMITE_MAXIMO);

  const where = {};
  if (tecnicoId) where.tecnicoId = tecnicoId;
  if (tipoTransaccion) where.tipo = tipoTransaccion;
  if (desde || hasta) {
    where.createdAt = {};
    if (desde) where.createdAt.gte = new Date(desde);
    if (hasta) where.createdAt.lte = new Date(hasta);
  }

  const [total, transacciones] = await prisma.$transaction([
    prisma.transaccionMonetizacion.count({ where }),
    prisma.transaccionMonetizacion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limiteFinal,
      take: limiteFinal,
      select: {
        id: true,
        tipo: true,
        monto: true,
        creditos: true,
        descripcion: true,
        referenciaId: true,
        createdAt: true,
        tecnico: { select: { id: true, usuario: { select: { id: true, email: true, nombre: true } } } },
      },
    }),
  ]);

  return {
    transacciones: transacciones.map((t) => ({
      id: t.id,
      tipo: t.tipo,
      monto: t.monto ? Number(t.monto) : null,
      creditos: t.creditos,
      descripcion: t.descripcion,
      referenciaId: t.referenciaId,
      createdAt: t.createdAt.toISOString(),
      tecnico: t.tecnico
        ? { id: t.tecnico.id, nombre: t.tecnico.usuario.nombre, email: t.tecnico.usuario.email }
        : null,
    })),
    paginacion: {
      page,
      limit: limiteFinal,
      total,
      total_paginas: Math.ceil(total / limiteFinal),
    },
  };
}

const TIPOS_INGRESO = ["compra_creditos", "activacion_plan", "cambio_modelo", "comision_servicio"];

async function resumenMonetizacion() {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const [
    totalTecnicos,
    conModelo,
    conCreditos,
    conMensualidad,
    planesActivos,
    creditosAgg,
    ingresosMesAgg,
    ingresosTotalesAgg,
    totalTransacciones,
    transaccionesMes,
  ] = await prisma.$transaction([
    prisma.tecnico.count(),
    prisma.monetizacionTecnico.count({ where: { tipo: { not: null } } }),
    prisma.monetizacionTecnico.count({ where: { tipo: "creditos" } }),
    prisma.monetizacionTecnico.count({ where: { tipo: "mensualidad" } }),
    prisma.monetizacionTecnico.count({ where: { tipo: "mensualidad", planVenceAt: { gt: ahora } } }),
    prisma.monetizacionTecnico.aggregate({ _sum: { creditosRestantes: true }, where: { tipo: "creditos" } }),
    prisma.transaccionMonetizacion.aggregate({ _sum: { monto: true }, where: { createdAt: { gte: inicioMes }, tipo: { in: TIPOS_INGRESO } } }),
    prisma.transaccionMonetizacion.aggregate({ _sum: { monto: true }, where: { tipo: { in: TIPOS_INGRESO } } }),
    prisma.transaccionMonetizacion.count(),
    prisma.transaccionMonetizacion.count({ where: { createdAt: { gte: inicioMes } } }),
  ]);

  return {
    tecnicos: {
      total: totalTecnicos,
      conModelo,
      creditos: conCreditos,
      mensualidad: conMensualidad,
    },
    planesActivos,
    creditosEnCirculacion: creditosAgg._sum.creditosRestantes ?? 0,
    ingresos: {
      mes: Number(ingresosMesAgg._sum.monto ?? 0),
      total: Number(ingresosTotalesAgg._sum.monto ?? 0),
    },
    transacciones: {
      total: totalTransacciones,
      mes: transaccionesMes,
    },
    generadoAt: ahora.toISOString(),
  };
}

module.exports = {
  listarTecnicosMonetizacion,
  listarTransaccionesMonetizacion,
  resumenMonetizacion,
};