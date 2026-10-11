const prisma = require("../../config/prisma");
const ApiError = require("../../config/ApiError");
const { urlPrivada } = require("../../config/cloudinary");
const { recalcularReputacion } = require("../resenas/resenas.service");
const { crearYemitir } = require("../notificaciones/notificaciones.service");

const TECNICO_SELECT = {
  id: true,
  estadoVerificacion: true,
  oficio: true,
  descripcion: true,
  aniosExperiencia: true,
  distritos: true,
  disponibilidad: true,
  documentosEnviadosAt: true,
  createdAt: true,
  usuario: { select: { id: true, email: true, nombre: true } },
};

const DOCUMENTO_SELECT = {
  id: true,
  tipo: true,
  publicId: true,
  resourceType: true,
  formato: true,
  nombreOriginal: true,
  bytes: true,
  estado: true,
  comentarioAdmin: true,
  createdAt: true,
  updatedAt: true,
};

function documentoConUrl(doc) {
  return { ...doc, url: urlPrivada(doc.publicId, doc.formato, doc.resourceType) };
}

async function listarTecnicos({ estado } = {}) {
  return prisma.tecnico.findMany({
    where: estado ? { estadoVerificacion: estado } : undefined,
    orderBy: [{ documentosEnviadosAt: "asc" }, { createdAt: "asc" }],
    select: TECNICO_SELECT,
  });
}

async function obtenerTecnicoDetalle(id) {
  const tecnico = await prisma.tecnico.findUnique({
    where: { id },
    select: {
      ...TECNICO_SELECT,
      documentos: { orderBy: { tipo: "asc" }, select: DOCUMENTO_SELECT },
      historial: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          estadoAnterior: true,
          estadoNuevo: true,
          comentario: true,
          createdAt: true,
          admin: { select: { id: true, nombre: true, email: true } },
        },
      },
    },
  });

  if (!tecnico) {
    throw new ApiError(404, "Técnico no encontrado");
  }

  return { ...tecnico, documentos: tecnico.documentos.map(documentoConUrl) };
}

async function obtenerTecnicoBasico(id) {
  const tecnico = await prisma.tecnico.findUnique({
    where: { id },
    select: { id: true, usuarioId: true, estadoVerificacion: true },
  });

  if (!tecnico) {
    throw new ApiError(404, "Técnico no encontrado");
  }

  return tecnico;
}

const NOTIFICACION_VERIFICACION = {
  verificado: {
    tipo: "verificacion_aprobada",
    titulo: "Verificación aprobada",
    mensaje: "Tu cuenta fue verificada y ya apareces en las búsquedas",
  },
  observado: {
    tipo: "verificacion_observada",
    titulo: "Verificación observada",
    mensaje: "Tu verificación tiene observaciones, revisa tus documentos",
  },
  rechazado: {
    tipo: "verificacion_rechazada",
    titulo: "Verificación rechazada",
    mensaje: "Tu verificación fue rechazada",
  },
  suspendido: {
    tipo: "verificacion_suspendida",
    titulo: "Cuenta suspendida",
    mensaje: "Tu cuenta fue suspendida",
  },
};

async function notificarCambioVerificacion(usuarioId, tecnicoId, estadoNuevo, comentario) {
  const base = NOTIFICACION_VERIFICACION[estadoNuevo];
  if (!base) {
    return;
  }
  await crearYemitir({
    usuarioId,
    tipo: base.tipo,
    titulo: base.titulo,
    mensaje: comentario ? `${base.mensaje}: ${comentario}` : base.mensaje,
    datos: { tecnico_id: tecnicoId },
  });
}

function exigirEstado(tecnico, esperado, mensaje) {
  if (tecnico.estadoVerificacion !== esperado) {
    throw new ApiError(409, mensaje);
  }
}

async function registrarCambioEstado(adminId, tecnico, estadoNuevo, comentario, aprobarDocumentos = false) {
  const actualizado = await prisma.$transaction(async (tx) => {
    if (aprobarDocumentos) {
      await tx.documentoVerificacion.updateMany({
        where: { tecnicoId: tecnico.id },
        data: { estado: "aprobado" },
      });
    }

    await tx.historialVerificacion.create({
      data: {
        tecnicoId: tecnico.id,
        adminId,
        estadoAnterior: tecnico.estadoVerificacion,
        estadoNuevo,
        comentario,
      },
    });

    return tx.tecnico.update({
      where: { id: tecnico.id },
      data: { estadoVerificacion: estadoNuevo },
      select: TECNICO_SELECT,
    });
  });

  await notificarCambioVerificacion(tecnico.usuarioId, tecnico.id, estadoNuevo, comentario);
  return actualizado;
}

async function aprobar(adminId, tecnicoId, comentario) {
  const tecnico = await obtenerTecnicoBasico(tecnicoId);
  exigirEstado(tecnico, "en_revision", "El técnico no está en revisión");
  return registrarCambioEstado(adminId, tecnico, "verificado", comentario, true);
}

async function observar(adminId, tecnicoId, comentario) {
  const tecnico = await obtenerTecnicoBasico(tecnicoId);
  exigirEstado(tecnico, "en_revision", "El técnico no está en revisión");
  return registrarCambioEstado(adminId, tecnico, "observado", comentario);
}

async function rechazar(adminId, tecnicoId, comentario) {
  const tecnico = await obtenerTecnicoBasico(tecnicoId);
  exigirEstado(tecnico, "en_revision", "El técnico no está en revisión");
  return registrarCambioEstado(adminId, tecnico, "rechazado", comentario);
}

async function suspender(adminId, tecnicoId, motivo) {
  const tecnico = await obtenerTecnicoBasico(tecnicoId);
  exigirEstado(tecnico, "verificado", "Solo se puede suspender a un técnico verificado");
  return registrarCambioEstado(adminId, tecnico, "suspendido", motivo);
}

async function reactivar(adminId, tecnicoId, motivo) {
  const tecnico = await obtenerTecnicoBasico(tecnicoId);
  exigirEstado(tecnico, "suspendido", "Solo se puede reactivar a un técnico suspendido");
  return registrarCambioEstado(adminId, tecnico, "verificado", motivo);
}

async function marcarDocumento(adminId, tecnicoId, documentoId, { estado, comentario }) {
  const tecnico = await obtenerTecnicoBasico(tecnicoId);
  exigirEstado(tecnico, "en_revision", "El técnico no está en revisión");

  const documento = await prisma.documentoVerificacion.findFirst({
    where: { id: documentoId, tecnicoId: tecnico.id },
    select: { id: true },
  });

  if (!documento) {
    throw new ApiError(404, "Documento no encontrado");
  }

  const actualizado = await prisma.documentoVerificacion.update({
    where: { id: documento.id },
    data: { estado, comentarioAdmin: comentario ?? null },
    select: DOCUMENTO_SELECT,
  });

  return documentoConUrl(actualizado);
}

async function listarCancelacionesTardias() {
  const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const filas = await prisma.servicio.findMany({
    where: {
      cancelacionTardia: true,
      canceladoAt: { gte: desde },
      canceladoPorId: { not: null },
    },
    select: {
      canceladoPorId: true,
      canceladoPorRol: true,
      canceladoPor: { select: { id: true, nombre: true, email: true } },
    },
  });

  const acumulado = new Map();
  for (const fila of filas) {
    const clave = `${fila.canceladoPorId}:${fila.canceladoPorRol}`;
    const actual = acumulado.get(clave);
    if (actual) {
      actual.cancelacionesTardias += 1;
    } else {
      acumulado.set(clave, {
        usuarioId: fila.canceladoPor.id,
        rol: fila.canceladoPorRol,
        nombre: fila.canceladoPor.nombre,
        email: fila.canceladoPor.email,
        cancelacionesTardias: 1,
      });
    }
  }

  return [...acumulado.values()].sort((a, b) => b.cancelacionesTardias - a.cancelacionesTardias);
}

async function ocultarResena(adminId, resenaId, motivo) {
  const resena = await prisma.resena.findUnique({
    where: { id: resenaId },
    select: { id: true, tecnicoId: true, oculta: true },
  });

  if (!resena) {
    throw new ApiError(404, "Reseña no encontrada");
  }
  if (resena.oculta) {
    throw new ApiError(409, "La reseña ya está oculta");
  }

  return prisma.$transaction(async (tx) => {
    const actualizada = await tx.resena.update({
      where: { id: resenaId },
      data: {
        oculta: true,
        motivoOcultamiento: motivo,
        ocultadaPorId: adminId,
        ocultadaAt: new Date(),
      },
      select: {
        id: true,
        servicioId: true,
        calificacion: true,
        comentario: true,
        oculta: true,
        motivoOcultamiento: true,
        ocultadaAt: true,
      },
    });

    await recalcularReputacion(tx, resena.tecnicoId);
    return actualizada;
  });
}

module.exports = {
  listarTecnicos,
  obtenerTecnicoDetalle,
  aprobar,
  observar,
  rechazar,
  suspender,
  reactivar,
  marcarDocumento,
  listarCancelacionesTardias,
  ocultarResena,
};
