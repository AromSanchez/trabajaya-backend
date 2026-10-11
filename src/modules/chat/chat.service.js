const prisma = require("../../config/prisma");
const ApiError = require("../../config/ApiError");
const { crearYemitir } = require("../notificaciones/notificaciones.service");

const ESTADOS_CHAT_ABIERTO = ["pendiente", "aceptado"];
const LIMITE_MENSAJES_POR_DEFECTO = 30;
const LIMITE_MENSAJES_MAXIMO = 100;

const MENSAJE_SELECT = {
  id: true,
  servicioId: true,
  contenido: true,
  autorRol: true,
  createdAt: true,
  autor: { select: { id: true, nombre: true } },
};

function normalizarId(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, "Servicio inválido");
  }
  return id;
}

function serializarMensaje(mensaje) {
  return {
    id: mensaje.id,
    servicioId: mensaje.servicioId,
    contenido: mensaje.contenido,
    autor: {
      id: mensaje.autor.id,
      nombre: mensaje.autor.nombre,
      rol: mensaje.autorRol,
    },
    createdAt: mensaje.createdAt,
  };
}

async function participanteServicio(usuario, servicioId) {
  const servicio = await prisma.servicio.findUnique({
    where: { id: servicioId },
    select: {
      id: true,
      estado: true,
      clienteId: true,
      tecnico: { select: { usuarioId: true } },
    },
  });

  if (!servicio) {
    throw new ApiError(404, "Servicio no encontrado");
  }

  const esCliente = usuario.rol === "cliente" && servicio.clienteId === usuario.id;
  const esTecnico = usuario.rol === "tecnico" && servicio.tecnico.usuarioId === usuario.id;

  if (!esCliente && !esTecnico) {
    throw new ApiError(404, "Servicio no encontrado");
  }

  return servicio;
}

async function validarParticipante(usuario, servicioIdRaw) {
  const servicioId = normalizarId(servicioIdRaw);
  await participanteServicio(usuario, servicioId);
  return servicioId;
}

function validarContenido(contenidoRaw) {
  const contenido = typeof contenidoRaw === "string" ? contenidoRaw.trim() : "";
  if (!contenido) {
    throw new ApiError(400, "El mensaje no puede estar vacío");
  }
  if (contenido.length > 1000) {
    throw new ApiError(400, "El mensaje debe tener máximo 1000 caracteres");
  }
  return contenido;
}

async function enviarMensaje(usuario, servicioIdRaw, contenidoRaw) {
  const servicio = await participanteServicio(usuario, normalizarId(servicioIdRaw));

  if (!ESTADOS_CHAT_ABIERTO.includes(servicio.estado)) {
    throw new ApiError(409, "El chat de este servicio está cerrado");
  }

  const contenido = validarContenido(contenidoRaw);

  const mensaje = await prisma.mensaje.create({
    data: {
      servicioId: servicio.id,
      autorId: usuario.id,
      autorRol: usuario.rol,
      contenido,
    },
    select: MENSAJE_SELECT,
  });

  const serializado = serializarMensaje(mensaje);
  const destinatario =
    usuario.rol === "cliente" ? servicio.tecnico.usuarioId : servicio.clienteId;
  await crearYemitir({
    usuarioId: destinatario,
    tipo: "mensaje_nuevo",
    titulo: "Nuevo mensaje",
    mensaje: `${serializado.autor.nombre}: ${contenido.slice(0, 100)}`,
    datos: { servicio_id: servicio.id, mensaje_id: serializado.id },
  });

  return serializado;
}

async function listarMensajes(usuario, servicioIdRaw, { page = 1, limit } = {}) {
  const servicio = await participanteServicio(usuario, normalizarId(servicioIdRaw));
  const limiteFinal = Math.min(limit ?? LIMITE_MENSAJES_POR_DEFECTO, LIMITE_MENSAJES_MAXIMO);

  const [total, mensajes] = await prisma.$transaction([
    prisma.mensaje.count({ where: { servicioId: servicio.id } }),
    prisma.mensaje.findMany({
      where: { servicioId: servicio.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limiteFinal,
      take: limiteFinal,
      select: MENSAJE_SELECT,
    }),
  ]);

  return {
    mensajes: mensajes.reverse().map(serializarMensaje),
    paginacion: {
      page,
      limit: limiteFinal,
      total,
      total_paginas: Math.ceil(total / limiteFinal),
    },
  };
}

module.exports = {
  enviarMensaje,
  listarMensajes,
  validarParticipante,
  ESTADOS_CHAT_ABIERTO,
};
