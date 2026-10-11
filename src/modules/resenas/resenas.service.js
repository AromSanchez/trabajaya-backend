const prisma = require("../../config/prisma");
const ApiError = require("../../config/ApiError");
const { serializar, SERVICIO_SELECT } = require("../servicios/servicios.service");

const LIMITE_POR_DEFECTO = 20;
const LIMITE_MAXIMO = 50;

const HISTORIAL_SELECT = {
  ...SERVICIO_SELECT,
  resena: {
    select: { id: true, calificacion: true, comentario: true, createdAt: true },
  },
};

const RESENA_SELECT = {
  id: true,
  calificacion: true,
  comentario: true,
  createdAt: true,
};

const RESENA_PUBLICA_SELECT = {
  id: true,
  calificacion: true,
  comentario: true,
  createdAt: true,
  cliente: { select: { nombre: true } },
};

function normalizarLimite(limit) {
  return Math.min(limit ?? LIMITE_POR_DEFECTO, LIMITE_MAXIMO);
}

function paginacion(total, page, limit) {
  return { page, limit, total, total_paginas: Math.ceil(total / limit) };
}

function nombrePublico(nombre) {
  const partes = String(nombre).trim().split(/\s+/);
  if (partes.length <= 1) {
    return partes[0] || "";
  }
  return `${partes[0]} ${partes[partes.length - 1][0].toUpperCase()}.`;
}

function serializarResenaPublica(resena) {
  return {
    id: resena.id,
    calificacion: resena.calificacion,
    comentario: resena.comentario,
    cliente: nombrePublico(resena.cliente.nombre),
    createdAt: resena.createdAt,
  };
}

async function recalcularReputacion(tx, tecnicoId) {
  const agregado = await tx.resena.aggregate({
    where: { tecnicoId, oculta: false },
    _avg: { calificacion: true },
    _count: { _all: true },
  });
  const total = agregado._count._all;
  const promedio =
    total > 0 ? Math.round((agregado._avg.calificacion ?? 0) * 100) / 100 : null;

  await tx.tecnico.update({
    where: { id: tecnicoId },
    data: { calificacionPromedio: promedio, totalResenas: total },
  });
}

async function crearResena(usuario, servicioId, { calificacion, comentario }) {
  const servicio = await prisma.servicio.findUnique({
    where: { id: servicioId },
    select: { id: true, clienteId: true, tecnicoId: true, estado: true },
  });

  if (!servicio || servicio.clienteId !== usuario.id) {
    throw new ApiError(404, "Solicitud no encontrada");
  }
  if (servicio.estado !== "completado") {
    throw new ApiError(409, "Solo se puede reseñar un servicio completado");
  }

  const existente = await prisma.resena.findUnique({
    where: { servicioId },
    select: { id: true },
  });
  if (existente) {
    throw new ApiError(409, "Ya calificaste este servicio");
  }

  return prisma.$transaction(async (tx) => {
    const resena = await tx.resena.create({
      data: {
        servicioId,
        clienteId: usuario.id,
        tecnicoId: servicio.tecnicoId,
        calificacion,
        comentario: comentario || null,
      },
      select: RESENA_SELECT,
    });
    await recalcularReputacion(tx, servicio.tecnicoId);
    return resena;
  });
}

async function listarResenasPublicas(tecnicoId, { page = 1, limit } = {}) {
  const tecnico = await prisma.tecnico.findFirst({
    where: { id: tecnicoId, estadoVerificacion: "verificado", oficio: { not: null } },
    select: { id: true },
  });
  if (!tecnico) {
    throw new ApiError(404, "Técnico no encontrado");
  }

  const limiteFinal = normalizarLimite(limit);
  const where = { tecnicoId, oculta: false };

  const [total, resenas] = await prisma.$transaction([
    prisma.resena.count({ where }),
    prisma.resena.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limiteFinal,
      take: limiteFinal,
      select: RESENA_PUBLICA_SELECT,
    }),
  ]);

  return {
    resenas: resenas.map(serializarResenaPublica),
    paginacion: paginacion(total, page, limiteFinal),
  };
}

async function historial(usuario, { estado, page = 1, limit } = {}) {
  const where = { ...(estado ? { estado } : {}) };

  if (usuario.rol === "cliente") {
    where.clienteId = usuario.id;
  } else {
    const tecnico = await prisma.tecnico.findUnique({
      where: { usuarioId: usuario.id },
      select: { id: true },
    });
    if (!tecnico) {
      throw new ApiError(404, "Perfil de técnico no encontrado");
    }
    where.tecnicoId = tecnico.id;
  }

  const limiteFinal = normalizarLimite(limit);
  const [total, servicios] = await prisma.$transaction([
    prisma.servicio.count({ where }),
    prisma.servicio.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limiteFinal,
      take: limiteFinal,
      select: HISTORIAL_SELECT,
    }),
  ]);

  return {
    servicios: servicios.map((servicio) => ({
      ...serializar(servicio, usuario.rol),
      resena: servicio.resena,
    })),
    paginacion: paginacion(total, page, limiteFinal),
  };
}

module.exports = {
  crearResena,
  listarResenasPublicas,
  historial,
  recalcularReputacion,
};
