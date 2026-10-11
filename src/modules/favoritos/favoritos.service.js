const prisma = require("../../config/prisma");
const ApiError = require("../../config/ApiError");
const {
  DATOS_PUBLICOS_SELECT,
  tecnicoResumen,
} = require("../tecnicos/tecnicos.service");

const LIMITE_POR_DEFECTO = 20;
const LIMITE_MAXIMO = 50;

async function marcar(clienteId, tecnicoId) {
  const tecnico = await prisma.tecnico.findFirst({
    where: { id: tecnicoId, estadoVerificacion: "verificado", oficio: { not: null } },
    select: { id: true },
  });

  if (!tecnico) {
    throw new ApiError(404, "Técnico no encontrado");
  }

  const favorito = await prisma.favorito.upsert({
    where: { clienteId_tecnicoId: { clienteId, tecnicoId } },
    update: {},
    create: { clienteId, tecnicoId },
    select: { tecnicoId: true, createdAt: true },
  });

  return { tecnicoId: favorito.tecnicoId, favorito: true, createdAt: favorito.createdAt };
}

async function desmarcar(clienteId, tecnicoId) {
  await prisma.favorito.deleteMany({ where: { clienteId, tecnicoId } });
}

async function listar(clienteId, { page = 1, limit } = {}) {
  const limiteFinal = Math.min(limit ?? LIMITE_POR_DEFECTO, LIMITE_MAXIMO);

  const where = {
    clienteId,
    tecnico: { estadoVerificacion: "verificado", oficio: { not: null } },
  };

  const [total, favoritos] = await prisma.$transaction([
    prisma.favorito.count({ where }),
    prisma.favorito.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limiteFinal,
      take: limiteFinal,
      select: {
        createdAt: true,
        tecnico: { select: DATOS_PUBLICOS_SELECT },
      },
    }),
  ]);

  return {
    favoritos: favoritos.map((favorito) => ({
      ...tecnicoResumen(favorito.tecnico),
      favoritoDesde: favorito.createdAt,
    })),
    paginacion: {
      page,
      limit: limiteFinal,
      total,
      total_paginas: Math.ceil(total / limiteFinal),
    },
  };
}

module.exports = { marcar, desmarcar, listar };
