const prisma = require("../../config/prisma");
const ApiError = require("../../config/ApiError");
const {
  subirPrivado,
  eliminarArchivo,
  urlPrivada,
  CARPETA_VERIFICACION,
} = require("../../config/cloudinary");
const { DOCUMENTOS_OBLIGATORIOS } = require("./tecnicos.schemas");

const PERFIL_SELECT = {
  id: true,
  oficio: true,
  descripcion: true,
  aniosExperiencia: true,
  distritos: true,
  disponibilidad: true,
  estadoVerificacion: true,
  documentosEnviadosAt: true,
  usuario: { select: { id: true, email: true, nombre: true } },
};

const MIME_A_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};
const TIPOS_SOLO_IMAGEN = ["selfie"];

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

async function obtenerPerfil(usuarioId) {
  const tecnico = await prisma.tecnico.findUnique({
    where: { usuarioId },
    select: PERFIL_SELECT,
  });

  if (!tecnico) {
    throw new ApiError(404, "Perfil de técnico no encontrado");
  }

  return tecnico;
}

async function actualizarPerfil(usuarioId, datos) {
  const tecnico = await prisma.tecnico.findUnique({
    where: { usuarioId },
    select: { id: true },
  });

  if (!tecnico) {
    throw new ApiError(404, "Perfil de técnico no encontrado");
  }

  return prisma.tecnico.update({
    where: { usuarioId },
    data: datos,
    select: PERFIL_SELECT,
  });
}

async function obtenerTecnico(usuarioId, select) {
  const tecnico = await prisma.tecnico.findUnique({ where: { usuarioId }, select });
  if (!tecnico) {
    throw new ApiError(404, "Perfil de técnico no encontrado");
  }
  return tecnico;
}

function documentoPublico(doc) {
  return {
    id: doc.id,
    tipo: doc.tipo,
    formato: doc.formato,
    nombreOriginal: doc.nombreOriginal,
    bytes: doc.bytes,
    estado: doc.estado,
    comentarioAdmin: doc.comentarioAdmin,
    url: urlPrivada(doc.publicId, doc.formato, doc.resourceType),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function validarArchivo(tipo, archivo) {
  if (!archivo) {
    throw new ApiError(400, "Adjunta un archivo en el campo 'archivo'");
  }

  const extension = MIME_A_EXT[archivo.mimetype];
  if (!extension) {
    throw new ApiError(400, "Formato no permitido. Usa jpg, png o pdf");
  }

  if (TIPOS_SOLO_IMAGEN.includes(tipo) && extension === "pdf") {
    throw new ApiError(400, "La selfie debe ser una imagen jpg o png");
  }
}

async function listarDocumentos(usuarioId) {
  const tecnico = await obtenerTecnico(usuarioId, { id: true });
  const documentos = await prisma.documentoVerificacion.findMany({
    where: { tecnicoId: tecnico.id },
    orderBy: { tipo: "asc" },
    select: DOCUMENTO_SELECT,
  });
  return documentos.map(documentoPublico);
}

async function subirDocumento(usuarioId, tipo, archivo) {
  validarArchivo(tipo, archivo);

  const tecnico = await obtenerTecnico(usuarioId, { id: true, estadoVerificacion: true });

  if (tecnico.estadoVerificacion === "en_revision") {
    throw new ApiError(400, "No puedes modificar documentos mientras tu verificación está en revisión");
  }

  if (DOCUMENTOS_OBLIGATORIOS.includes(tipo)) {
    const anteriores = await prisma.documentoVerificacion.findMany({
      where: { tecnicoId: tecnico.id, tipo },
      select: { publicId: true, resourceType: true },
    });
    await Promise.all(anteriores.map((d) => eliminarArchivo(d.publicId, d.resourceType)));
    await prisma.documentoVerificacion.deleteMany({ where: { tecnicoId: tecnico.id, tipo } });
  }

  let subida;
  try {
    subida = await subirPrivado(archivo.buffer, `${CARPETA_VERIFICACION}/${tecnico.id}/verificacion`);
  } catch {
    throw new ApiError(502, "No se pudo subir el archivo a Cloudinary");
  }

  const documento = await prisma.documentoVerificacion.create({
    data: {
      tecnicoId: tecnico.id,
      tipo,
      publicId: subida.public_id,
      resourceType: subida.resource_type,
      formato: subida.format,
      nombreOriginal: archivo.originalname,
      bytes: subida.bytes,
      estado: "pendiente",
    },
    select: DOCUMENTO_SELECT,
  });

  return documentoPublico(documento);
}

async function eliminarDocumento(usuarioId, documentoId) {
  const tecnico = await obtenerTecnico(usuarioId, { id: true, estadoVerificacion: true });

  if (tecnico.estadoVerificacion === "en_revision") {
    throw new ApiError(400, "No puedes modificar documentos mientras tu verificación está en revisión");
  }

  const documento = await prisma.documentoVerificacion.findFirst({
    where: { id: documentoId, tecnicoId: tecnico.id },
    select: { id: true, publicId: true, resourceType: true },
  });

  if (!documento) {
    throw new ApiError(404, "Documento no encontrado");
  }

  await eliminarArchivo(documento.publicId, documento.resourceType);
  await prisma.documentoVerificacion.delete({ where: { id: documento.id } });
}

async function enviarARevision(usuarioId) {
  const tecnico = await obtenerTecnico(usuarioId, {
    id: true,
    estadoVerificacion: true,
    documentos: { select: { tipo: true } },
  });

  const ESTADOS_QUE_PERMITEN_ENVIO = ["pendiente", "observado"];
  if (!ESTADOS_QUE_PERMITEN_ENVIO.includes(tecnico.estadoVerificacion)) {
    const mensajes = {
      en_revision: "Tu verificación ya está en revisión",
      verificado: "Tu verificación ya está aprobada",
      suspendido: "Tu cuenta está suspendida, no puedes enviar documentos a revisión",
      rechazado: "Tu verificación fue rechazada",
    };
    throw new ApiError(
      400,
      mensajes[tecnico.estadoVerificacion] || "No puedes enviar documentos a revisión",
    );
  }

  const tiposPresentes = new Set(tecnico.documentos.map((d) => d.tipo));
  const faltantes = DOCUMENTOS_OBLIGATORIOS.filter((tipo) => !tiposPresentes.has(tipo));
  if (faltantes.length > 0) {
    throw new ApiError(400, "Faltan documentos obligatorios", { faltantes });
  }

  return prisma.$transaction(async (tx) => {
    await tx.documentoVerificacion.updateMany({
      where: { tecnicoId: tecnico.id },
      data: { estado: "pendiente", comentarioAdmin: null },
    });

    return tx.tecnico.update({
      where: { id: tecnico.id },
      data: { estadoVerificacion: "en_revision", documentosEnviadosAt: new Date() },
      select: { estadoVerificacion: true, documentosEnviadosAt: true },
    });
  });
}

module.exports = {
  obtenerPerfil,
  actualizarPerfil,
  listarDocumentos,
  subirDocumento,
  eliminarDocumento,
  enviarARevision,
};
