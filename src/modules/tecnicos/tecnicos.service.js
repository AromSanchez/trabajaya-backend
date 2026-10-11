const prisma = require("../../config/prisma");
const ApiError = require("../../config/ApiError");

const PERFIL_SELECT = {
  id: true,
  oficio: true,
  descripcion: true,
  aniosExperiencia: true,
  distritos: true,
  disponibilidad: true,
  estadoVerificacion: true,
  usuario: { select: { id: true, email: true, nombre: true } },
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

module.exports = { obtenerPerfil, actualizarPerfil };
