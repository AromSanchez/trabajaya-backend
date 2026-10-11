const prisma = require("../../config/prisma");
const ApiError = require("../../config/ApiError");
const { urlPrivada } = require("../../config/cloudinary");

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
    select: { id: true, estadoVerificacion: true },
  });

  if (!tecnico) {
    throw new ApiError(404, "Técnico no encontrado");
  }

  return tecnico;
}

function exigirEstado(tecnico, esperado, mensaje) {
  if (tecnico.estadoVerificacion !== esperado) {
    throw new ApiError(409, mensaje);
  }
}

async function registrarCambioEstado(adminId, tecnico, estadoNuevo, comentario, aprobarDocumentos = false) {
  return prisma.$transaction(async (tx) => {
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

module.exports = {
  listarTecnicos,
  obtenerTecnicoDetalle,
  aprobar,
  observar,
  rechazar,
  suspender,
  reactivar,
  marcarDocumento,
};
