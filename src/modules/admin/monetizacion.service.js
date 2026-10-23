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
  if (tipo) where.monetizacion = { tipo };

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

module.exports = {
  listarTecnicosMonetizacion,
  listarTransaccionesMonetizacion,
};