const prisma = require("../../config/prisma");
const ApiError = require("../../config/ApiError");

const LIMITE_POR_DEFECTO = 20;
const LIMITE_MAXIMO = 50;

const ESTADOS_REPORTABLES = ["aceptado", "completado", "cancelado"];

const TIPOS_POR_ROL = {
  cliente: ["tecnico"],
  tecnico: ["cliente", "resena"],
};

const CATEGORIAS_POR_OBJETIVO = {
  tecnico: [
    "no_se_presento",
    "trabajo_deficiente",
    "cobro_diferente",
    "comportamiento_inapropiado",
    "fraude",
    "otro",
  ],
  cliente: ["no_estaba", "comportamiento_inapropiado", "fraude", "otro"],
  resena: ["contenido_inapropiado", "fraude", "otro"],
};

const CATEGORIAS_CON_COMENTARIO_OBLIGATORIO = ["fraude", "otro"];

const REPORTE_SELECT = {
  id: true,
  tipoObjetivo: true,
  categoria: true,
  comentario: true,
  estado: true,
  notaResolucion: true,
  resueltoAt: true,
  createdAt: true,
  updatedAt: true,
  reportante: { select: { id: true, nombre: true, rol: true } },
  objetivoUsuario: { select: { id: true, nombre: true, rol: true } },
  objetivoResena: { select: { id: true, calificacion: true, comentario: true, oculta: true } },
  servicio: { select: { id: true, estado: true } },
  resueltoPor: { select: { id: true, nombre: true } },
};

function serializarReporte(reporte) {
  const objetivo =
    reporte.tipoObjetivo === "resena"
      ? {
          tipo: "resena",
          id: reporte.objetivoResena.id,
          calificacion: reporte.objetivoResena.calificacion,
          comentario: reporte.objetivoResena.comentario,
        }
      : {
          tipo: reporte.tipoObjetivo,
          id: reporte.objetivoUsuario.id,
          nombre: reporte.objetivoUsuario.nombre,
          rol: reporte.objetivoUsuario.rol,
        };

  return {
    id: reporte.id,
    tipoObjetivo: reporte.tipoObjetivo,
    categoria: reporte.categoria,
    comentario: reporte.comentario,
    estado: reporte.estado,
    reportante: reporte.reportante,
    objetivo,
    servicio: reporte.servicio,
    notaResolucion: reporte.notaResolucion,
    resueltoPor: reporte.resueltoPor,
    resueltoAt: reporte.resueltoAt,
    createdAt: reporte.createdAt,
    updatedAt: reporte.updatedAt,
  };
}

function paginacion(total, page, limit) {
  return { page, limit, total, total_paginas: Math.ceil(total / limit) };
}

async function crearReporte(usuario, datos) {
  const { tipo_objetivo, servicio_id, resena_id, categoria, comentario } = datos;

  if (!TIPOS_POR_ROL[usuario.rol]?.includes(tipo_objetivo)) {
    throw new ApiError(403, "No puedes crear este tipo de reporte");
  }
  if (!CATEGORIAS_POR_OBJETIVO[tipo_objetivo].includes(categoria)) {
    throw new ApiError(400, "La categoría no corresponde al objetivo del reporte");
  }
  if (CATEGORIAS_CON_COMENTARIO_OBLIGATORIO.includes(categoria) && !comentario) {
    throw new ApiError(400, "El comentario es obligatorio para esta categoría");
  }

  let servicioId;
  let objetivoData;

  if (tipo_objetivo === "resena") {
    if (!resena_id) {
      throw new ApiError(400, "La reseña es obligatoria");
    }
    const resena = await prisma.resena.findUnique({
      where: { id: resena_id },
      select: { id: true, servicioId: true, tecnico: { select: { usuarioId: true } } },
    });
    if (!resena || resena.tecnico.usuarioId !== usuario.id) {
      throw new ApiError(404, "Reseña no encontrada");
    }
    servicioId = resena.servicioId;
    objetivoData = { objetivoResenaId: resena.id };
  } else {
    if (!servicio_id) {
      throw new ApiError(400, "El servicio es obligatorio");
    }
    const servicio = await prisma.servicio.findUnique({
      where: { id: servicio_id },
      select: {
        id: true,
        estado: true,
        clienteId: true,
        tecnico: { select: { usuarioId: true } },
      },
    });
    if (!servicio) {
      throw new ApiError(404, "Solicitud no encontrada");
    }
    if (!ESTADOS_REPORTABLES.includes(servicio.estado)) {
      throw new ApiError(409, "No se puede reportar este servicio en su estado actual");
    }

    if (tipo_objetivo === "tecnico") {
      if (servicio.clienteId !== usuario.id) {
        throw new ApiError(404, "Solicitud no encontrada");
      }
      objetivoData = { objetivoUsuarioId: servicio.tecnico.usuarioId };
    } else {
      if (servicio.tecnico.usuarioId !== usuario.id) {
        throw new ApiError(404, "Solicitud no encontrada");
      }
      objetivoData = { objetivoUsuarioId: servicio.clienteId };
    }
    servicioId = servicio.id;
  }

  const duplicado = await prisma.reporte.findFirst({
    where: { reportanteId: usuario.id, servicioId, tipoObjetivo: tipo_objetivo },
    select: { id: true },
  });
  if (duplicado) {
    throw new ApiError(409, "Ya reportaste este objetivo en este servicio");
  }

  const reporte = await prisma.reporte.create({
    data: {
      servicioId,
      reportanteId: usuario.id,
      reportanteRol: usuario.rol,
      tipoObjetivo: tipo_objetivo,
      categoria,
      comentario: comentario || null,
      ...objetivoData,
    },
    select: REPORTE_SELECT,
  });

  return serializarReporte(reporte);
}

async function listarReportes({ estado, tipo_objetivo, categoria, page = 1, limit } = {}) {
  const limiteFinal = Math.min(limit ?? LIMITE_POR_DEFECTO, LIMITE_MAXIMO);
  const where = {
    ...(estado ? { estado } : {}),
    ...(tipo_objetivo ? { tipoObjetivo: tipo_objetivo } : {}),
    ...(categoria ? { categoria } : {}),
  };

  const [total, reportes] = await prisma.$transaction([
    prisma.reporte.count({ where }),
    prisma.reporte.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limiteFinal,
      take: limiteFinal,
      select: REPORTE_SELECT,
    }),
  ]);

  return {
    reportes: reportes.map(serializarReporte),
    paginacion: paginacion(total, page, limiteFinal),
  };
}

async function obtenerReporte(id) {
  const reporte = await prisma.reporte.findUnique({
    where: { id },
    select: REPORTE_SELECT,
  });

  if (!reporte) {
    throw new ApiError(404, "Reporte no encontrado");
  }

  return serializarReporte(reporte);
}

async function resolverReporte(adminId, id, { estado, nota }) {
  const reporte = await prisma.reporte.findUnique({
    where: { id },
    select: { id: true, estado: true },
  });

  if (!reporte) {
    throw new ApiError(404, "Reporte no encontrado");
  }
  if (reporte.estado !== "pendiente") {
    throw new ApiError(409, "El reporte ya fue resuelto o descartado");
  }

  const actualizado = await prisma.reporte.update({
    where: { id },
    data: {
      estado,
      notaResolucion: nota,
      resueltoPorId: adminId,
      resueltoAt: new Date(),
    },
    select: REPORTE_SELECT,
  });

  return serializarReporte(actualizado);
}

module.exports = {
  crearReporte,
  listarReportes,
  obtenerReporte,
  resolverReporte,
};
