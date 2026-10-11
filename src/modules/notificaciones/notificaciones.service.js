const prisma = require("../../config/prisma");
const ApiError = require("../../config/ApiError");

const LIMITE_POR_DEFECTO = 20;
const LIMITE_MAXIMO = 50;

const NOTIFICACION_SELECT = {
  id: true,
  usuarioId: true,
  tipo: true,
  titulo: true,
  mensaje: true,
  datos: true,
  leida: true,
  leidaAt: true,
  createdAt: true,
};

function serializar(notificacion) {
  return {
    id: notificacion.id,
    tipo: notificacion.tipo,
    titulo: notificacion.titulo,
    mensaje: notificacion.mensaje,
    datos: notificacion.datos,
    leida: notificacion.leida,
    leidaAt: notificacion.leidaAt,
    createdAt: notificacion.createdAt,
  };
}

function emitir(notificacion) {
  try {
    const { obtenerIO, salaUsuario } = require("../../config/socket");
    const io = obtenerIO();
    if (io) {
      io.to(salaUsuario(notificacion.usuarioId)).emit("notificacion:nueva", {
        notificacion: serializar(notificacion),
      });
    }
  } catch (error) {
    console.error("No se pudo emitir la notificación:", error.message);
  }
}

async function crearYemitir({ usuarioId, tipo, titulo, mensaje, datos }) {
  try {
    const notificacion = await prisma.notificacion.create({
      data: {
        usuarioId,
        tipo,
        titulo,
        mensaje: mensaje ?? null,
        datos: datos ?? null,
      },
      select: NOTIFICACION_SELECT,
    });
    emitir(notificacion);
    return notificacion;
  } catch (error) {
    console.error("No se pudo crear la notificación:", error.message);
    return null;
  }
}

async function listar(usuarioId, { leida, page = 1, limit } = {}) {
  const limiteFinal = Math.min(limit ?? LIMITE_POR_DEFECTO, LIMITE_MAXIMO);
  const where = { usuarioId, ...(leida === undefined ? {} : { leida }) };

  const [total, noLeidas, notificaciones] = await prisma.$transaction([
    prisma.notificacion.count({ where }),
    prisma.notificacion.count({ where: { usuarioId, leida: false } }),
    prisma.notificacion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limiteFinal,
      take: limiteFinal,
      select: NOTIFICACION_SELECT,
    }),
  ]);

  return {
    notificaciones: notificaciones.map(serializar),
    noLeidas,
    paginacion: {
      page,
      limit: limiteFinal,
      total,
      total_paginas: Math.ceil(total / limiteFinal),
    },
  };
}

async function contarNoLeidas(usuarioId) {
  return prisma.notificacion.count({ where: { usuarioId, leida: false } });
}

async function marcarLeida(usuarioId, id) {
  const notificacion = await prisma.notificacion.findFirst({
    where: { id, usuarioId },
    select: { id: true, leida: true },
  });

  if (!notificacion) {
    throw new ApiError(404, "Notificación no encontrada");
  }
  if (notificacion.leida) {
    const actual = await prisma.notificacion.findUnique({
      where: { id },
      select: NOTIFICACION_SELECT,
    });
    return serializar(actual);
  }

  const actualizada = await prisma.notificacion.update({
    where: { id },
    data: { leida: true, leidaAt: new Date() },
    select: NOTIFICACION_SELECT,
  });
  return serializar(actualizada);
}

async function marcarTodasLeidas(usuarioId) {
  const resultado = await prisma.notificacion.updateMany({
    where: { usuarioId, leida: false },
    data: { leida: true, leidaAt: new Date() },
  });
  return resultado.count;
}

module.exports = {
  crearYemitir,
  listar,
  contarNoLeidas,
  marcarLeida,
  marcarTodasLeidas,
};
