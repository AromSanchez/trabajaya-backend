const prisma = require("../../config/prisma");
const ApiError = require("../../config/ApiError");
const {
  subirPrivado,
  eliminarArchivo,
  urlPrivada,
  CARPETA_SERVICIOS,
} = require("../../config/cloudinary");

const HORAS_EXPIRACION = 24;
const HORAS_CANCELACION_TARDIA = 2;
const PENDIENTES_MAX = 3;

const MIME_A_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

const ESTADOS_CON_DIRECCION_TECNICO = ["aceptado", "completado"];
const ESTADOS_CON_PROPUESTA = ["pendiente", "aceptado"];

const PROPUESTA_SELECT = {
  id: true,
  monto: true,
  alcance: true,
  estado: true,
  motivoRechazo: true,
  createdAt: true,
  updatedAt: true,
  creadaPor: { select: { id: true, nombre: true, rol: true } },
  respondidaPor: { select: { id: true, nombre: true, rol: true } },
};

const SERVICIO_SELECT = {
  id: true,
  descripcion: true,
  fechaHora: true,
  distrito: true,
  direccion: true,
  estado: true,
  motivoRechazo: true,
  motivoCancelacion: true,
  cancelacionTardia: true,
  canceladoPorRol: true,
  canceladoAt: true,
  completadoPorRol: true,
  completadoAt: true,
  aceptadoAt: true,
  comisionPorcentaje: true,
  montoAcordado: true,
  alcanceAcordado: true,
  createdAt: true,
  updatedAt: true,
  cliente: { select: { id: true, nombre: true } },
  tecnico: { select: { id: true, usuario: { select: { id: true, nombre: true } } } },
  fotos: { select: { id: true, publicId: true, resourceType: true, formato: true, bytes: true, nombreOriginal: true } },
  propuestas: { orderBy: { createdAt: "desc" }, select: PROPUESTA_SELECT },
};

function fotoConUrl(foto) {
  return {
    id: foto.id,
    formato: foto.formato,
    bytes: foto.bytes,
    nombreOriginal: foto.nombreOriginal,
    url: urlPrivada(foto.publicId, foto.formato, foto.resourceType),
  };
}

function serializarPropuesta(propuesta) {
  return {
    id: propuesta.id,
    monto: Number(propuesta.monto),
    alcance: propuesta.alcance,
    estado: propuesta.estado,
    motivoRechazo: propuesta.motivoRechazo,
    creadaPor: {
      id: propuesta.creadaPor.id,
      nombre: propuesta.creadaPor.nombre,
      rol: propuesta.creadaPor.rol,
    },
    respondidaPor: propuesta.respondidaPor
      ? {
          id: propuesta.respondidaPor.id,
          nombre: propuesta.respondidaPor.nombre,
          rol: propuesta.respondidaPor.rol,
        }
      : null,
    createdAt: propuesta.createdAt,
    updatedAt: propuesta.updatedAt,
  };
}

function serializar(servicio, rol) {
  const verDireccion = rol !== "tecnico" || ESTADOS_CON_DIRECCION_TECNICO.includes(servicio.estado);
  return {
    id: servicio.id,
    estado: servicio.estado,
    descripcion: servicio.descripcion,
    fechaHora: servicio.fechaHora,
    distrito: servicio.distrito,
    direccion: verDireccion ? servicio.direccion : null,
    fotos: servicio.fotos.map(fotoConUrl),
    cliente: { id: servicio.cliente.id, nombre: servicio.cliente.nombre },
    tecnico: { id: servicio.tecnico.id, nombre: servicio.tecnico.usuario.nombre },
    motivoRechazo: servicio.motivoRechazo,
    motivoCancelacion: servicio.motivoCancelacion,
    cancelacionTardia: servicio.cancelacionTardia,
    canceladoPorRol: servicio.canceladoPorRol,
    canceladoAt: servicio.canceladoAt,
    completadoPorRol: servicio.completadoPorRol,
    completadoAt: servicio.completadoAt,
    aceptadoAt: servicio.aceptadoAt,
    comisionPorcentaje: Number(servicio.comisionPorcentaje),
    montoAcordado: servicio.montoAcordado === null ? null : Number(servicio.montoAcordado),
    alcanceAcordado: servicio.alcanceAcordado,
    propuestas: servicio.propuestas.map(serializarPropuesta),
    createdAt: servicio.createdAt,
    updatedAt: servicio.updatedAt,
  };
}

async function obtenerComisionPorcentaje() {
  const fila = await prisma.configuracion.findUnique({
    where: { clave: "comision_porcentaje" },
    select: { valor: true },
  });
  const valor = fila ? Number(fila.valor) : 0;
  return Number.isFinite(valor) ? valor : 0;
}

async function expirarPendientes() {
  const limite = new Date(Date.now() - HORAS_EXPIRACION * 60 * 60 * 1000);
  const pendientes = await prisma.servicio.findMany({
    where: { estado: "pendiente", createdAt: { lte: limite } },
    select: { id: true },
  });

  if (pendientes.length === 0) {
    return 0;
  }

  const ids = pendientes.map((s) => s.id);
  await prisma.$transaction([
    prisma.servicio.updateMany({
      where: { id: { in: ids } },
      data: { estado: "expirado" },
    }),
    prisma.historialServicio.createMany({
      data: ids.map((id) => ({
        servicioId: id,
        actorId: null,
        actorRol: "sistema",
        estadoAnterior: "pendiente",
        estadoNuevo: "expirado",
        motivo: "Sin respuesta del técnico en 24 horas",
      })),
    }),
  ]);

  return ids.length;
}

async function tecnicoIdDeUsuario(usuarioId) {
  const tecnico = await prisma.tecnico.findUnique({
    where: { usuarioId },
    select: { id: true },
  });
  if (!tecnico) {
    throw new ApiError(404, "Perfil de técnico no encontrado");
  }
  return tecnico.id;
}

function validarFotos(archivos) {
  if (!archivos || archivos.length === 0) {
    return [];
  }
  return archivos.map((archivo) => {
    const extension = MIME_A_EXT[archivo.mimetype];
    if (!extension) {
      throw new ApiError(400, "Las fotos deben ser jpg o png");
    }
    return { archivo, extension };
  });
}

async function subirFotos(archivos) {
  const subidas = [];
  try {
    for (const { archivo } of archivos) {
      const resultado = await subirPrivado(archivo.buffer, CARPETA_SERVICIOS);
      subidas.push({
        publicId: resultado.public_id,
        resourceType: resultado.resource_type,
        formato: resultado.format,
        bytes: resultado.bytes,
        nombreOriginal: archivo.originalname,
      });
    }
    return subidas;
  } catch (error) {
    await Promise.all(
      subidas.map((f) => eliminarArchivo(f.publicId, f.resourceType).catch(() => {})),
    );
    throw error;
  }
}

async function crearServicio(usuarioId, datos, archivos) {
  await expirarPendientes();

  const tecnico = await prisma.tecnico.findUnique({
    where: { id: datos.tecnico_id },
    select: { id: true, estadoVerificacion: true, disponible: true },
  });

  if (!tecnico) {
    throw new ApiError(404, "Técnico no encontrado");
  }
  if (tecnico.estadoVerificacion !== "verificado") {
    throw new ApiError(409, "El técnico no está verificado");
  }
  if (!tecnico.disponible) {
    throw new ApiError(409, "El técnico no está disponible en este momento");
  }

  if (datos.fecha_hora.getTime() <= Date.now()) {
    throw new ApiError(400, "La fecha y hora deben ser futuras");
  }

  const repetido = await prisma.servicio.findFirst({
    where: { clienteId: usuarioId, tecnicoId: tecnico.id, estado: "pendiente" },
    select: { id: true },
  });
  if (repetido) {
    throw new ApiError(409, "Ya tienes una solicitud pendiente con este técnico");
  }

  const pendientes = await prisma.servicio.count({
    where: { clienteId: usuarioId, estado: "pendiente" },
  });
  if (pendientes >= PENDIENTES_MAX) {
    throw new ApiError(409, `Ya tienes ${PENDIENTES_MAX} solicitudes pendientes`);
  }

  const fotosValidadas = validarFotos(archivos);
  const fotosSubidas = await subirFotos(fotosValidadas);

  const comisionPorcentaje = await obtenerComisionPorcentaje();

  let servicioId;
  try {
    servicioId = await prisma.$transaction(async (tx) => {
      const servicio = await tx.servicio.create({
        data: {
          clienteId: usuarioId,
          tecnicoId: tecnico.id,
          descripcion: datos.descripcion,
          fechaHora: datos.fecha_hora,
          distrito: datos.distrito,
          direccion: datos.direccion,
          comisionPorcentaje,
        },
        select: { id: true },
      });

      if (fotosSubidas.length > 0) {
        await tx.fotoServicio.createMany({
          data: fotosSubidas.map((foto) => ({ ...foto, servicioId: servicio.id })),
        });
      }

      await tx.historialServicio.create({
        data: {
          servicioId: servicio.id,
          actorId: usuarioId,
          actorRol: "cliente",
          estadoAnterior: null,
          estadoNuevo: "pendiente",
        },
      });

      return servicio.id;
    });
  } catch (error) {
    await Promise.all(
      fotosSubidas.map((f) => eliminarArchivo(f.publicId, f.resourceType).catch(() => {})),
    );
    throw error;
  }

  const servicio = await obtenerServicioPorId(servicioId);
  return serializar(servicio, "cliente");
}

async function obtenerServicioPorId(id) {
  return prisma.servicio.findUnique({ where: { id }, select: SERVICIO_SELECT });
}

async function listarServicios(usuario) {
  await expirarPendientes();

  const where =
    usuario.rol === "tecnico"
      ? { tecnicoId: await tecnicoIdDeUsuario(usuario.id) }
      : { clienteId: usuario.id };

  const servicios = await prisma.servicio.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: SERVICIO_SELECT,
  });

  return servicios.map((servicio) => serializar(servicio, usuario.rol));
}

async function obtenerServicio(usuario, id) {
  await expirarPendientes();

  const servicio = await obtenerServicioPorId(id);
  if (!servicio) {
    throw new ApiError(404, "Solicitud no encontrada");
  }

  if (usuario.rol === "cliente" && servicio.cliente.id !== usuario.id) {
    throw new ApiError(404, "Solicitud no encontrada");
  }
  if (usuario.rol === "tecnico" && servicio.tecnico.usuario.id !== usuario.id) {
    throw new ApiError(404, "Solicitud no encontrada");
  }

  return serializar(servicio, usuario.rol);
}

async function aceptar(usuarioId, id) {
  await expirarPendientes();

  const tecnicoId = await tecnicoIdDeUsuario(usuarioId);
  const servicio = await prisma.servicio.findFirst({
    where: { id, tecnicoId },
    select: { id: true, estado: true },
  });

  if (!servicio) {
    throw new ApiError(404, "Solicitud no encontrada");
  }
  if (servicio.estado !== "pendiente") {
    throw new ApiError(409, "La solicitud ya no está pendiente");
  }

  await prisma.$transaction(async (tx) => {
    await tx.historialServicio.create({
      data: {
        servicioId: servicio.id,
        actorId: usuarioId,
        actorRol: "tecnico",
        estadoAnterior: "pendiente",
        estadoNuevo: "aceptado",
      },
    });
    await tx.servicio.update({
      where: { id: servicio.id },
      data: { estado: "aceptado", aceptadoAt: new Date() },
    });
  });

  return serializar(await obtenerServicioPorId(servicio.id), "tecnico");
}

async function rechazar(usuarioId, id, motivo) {
  await expirarPendientes();

  const tecnicoId = await tecnicoIdDeUsuario(usuarioId);
  const servicio = await prisma.servicio.findFirst({
    where: { id, tecnicoId },
    select: { id: true, estado: true },
  });

  if (!servicio) {
    throw new ApiError(404, "Solicitud no encontrada");
  }
  if (servicio.estado !== "pendiente") {
    throw new ApiError(409, "La solicitud ya no está pendiente");
  }

  await prisma.$transaction(async (tx) => {
    await tx.historialServicio.create({
      data: {
        servicioId: servicio.id,
        actorId: usuarioId,
        actorRol: "tecnico",
        estadoAnterior: "pendiente",
        estadoNuevo: "rechazado",
        motivo,
      },
    });
    await tx.servicio.update({
      where: { id: servicio.id },
      data: { estado: "rechazado", motivoRechazo: motivo },
    });
  });

  return serializar(await obtenerServicioPorId(servicio.id), "tecnico");
}

async function completar(usuario, id) {
  await expirarPendientes();

  const servicio = await obtenerServicioParaActor(usuario, id);
  if (servicio.estado !== "aceptado") {
    throw new ApiError(409, "Solo se puede completar un servicio aceptado");
  }
  if (servicio.fechaHora.getTime() > Date.now()) {
    throw new ApiError(400, "Aún no llega la fecha y hora del servicio");
  }

  await prisma.$transaction(async (tx) => {
    await tx.historialServicio.create({
      data: {
        servicioId: servicio.id,
        actorId: usuario.id,
        actorRol: usuario.rol,
        estadoAnterior: "aceptado",
        estadoNuevo: "completado",
      },
    });
    await tx.servicio.update({
      where: { id: servicio.id },
      data: {
        estado: "completado",
        completadoPorId: usuario.id,
        completadoPorRol: usuario.rol,
        completadoAt: new Date(),
      },
    });
  });

  return serializar(await obtenerServicioPorId(servicio.id), usuario.rol);
}

async function cancelar(usuario, id, motivo) {
  await expirarPendientes();

  const servicio = await obtenerServicioParaActor(usuario, id);

  const puedeCancelar =
    (usuario.rol === "cliente" && ["pendiente", "aceptado"].includes(servicio.estado)) ||
    (usuario.rol === "tecnico" && servicio.estado === "aceptado");

  if (!puedeCancelar) {
    throw new ApiError(409, "No puedes cancelar una solicitud en este estado");
  }

  const tardia =
    servicio.estado === "aceptado" &&
    servicio.fechaHora.getTime() - Date.now() < HORAS_CANCELACION_TARDIA * 60 * 60 * 1000;

  await prisma.$transaction(async (tx) => {
    await tx.historialServicio.create({
      data: {
        servicioId: servicio.id,
        actorId: usuario.id,
        actorRol: usuario.rol,
        estadoAnterior: servicio.estado,
        estadoNuevo: "cancelado",
        motivo,
      },
    });
    await tx.servicio.update({
      where: { id: servicio.id },
      data: {
        estado: "cancelado",
        canceladoPorId: usuario.id,
        canceladoPorRol: usuario.rol,
        motivoCancelacion: motivo,
        cancelacionTardia: tardia,
        canceladoAt: new Date(),
      },
    });
  });

  return serializar(await obtenerServicioPorId(servicio.id), usuario.rol);
}

async function crearPropuesta(usuarioId, id, datos) {
  await expirarPendientes();

  const tecnicoId = await tecnicoIdDeUsuario(usuarioId);
  const servicio = await prisma.servicio.findFirst({
    where: { id, tecnicoId },
    select: { id: true, estado: true },
  });

  if (!servicio) {
    throw new ApiError(404, "Solicitud no encontrada");
  }
  if (!ESTADOS_CON_PROPUESTA.includes(servicio.estado)) {
    throw new ApiError(409, "No se puede proponer un precio en este estado");
  }

  const monto = Math.round(datos.monto * 100) / 100;

  await prisma.$transaction(async (tx) => {
    await tx.propuesta.updateMany({
      where: { servicioId: servicio.id, estado: "pendiente" },
      data: { estado: "rechazada", motivoRechazo: "Reemplazada por una nueva propuesta" },
    });
    await tx.propuesta.create({
      data: {
        servicioId: servicio.id,
        monto,
        alcance: datos.alcance,
        creadaPorId: usuarioId,
      },
    });
  });

  return serializar(await obtenerServicioPorId(servicio.id), "tecnico");
}

async function aceptarPropuesta(usuario, id) {
  await expirarPendientes();

  const servicio = await obtenerServicioParaActor(usuario, id);
  if (!ESTADOS_CON_PROPUESTA.includes(servicio.estado)) {
    throw new ApiError(409, "No se puede aceptar una propuesta en este estado");
  }

  const propuesta = await prisma.propuesta.findFirst({
    where: { servicioId: servicio.id, estado: "pendiente" },
    orderBy: { createdAt: "desc" },
    select: { id: true, monto: true, alcance: true },
  });
  if (!propuesta) {
    throw new ApiError(404, "No hay una propuesta pendiente");
  }

  await prisma.$transaction(async (tx) => {
    await tx.propuesta.update({
      where: { id: propuesta.id },
      data: { estado: "aceptada", respondidaPorId: usuario.id },
    });
    await tx.servicio.update({
      where: { id: servicio.id },
      data: { montoAcordado: propuesta.monto, alcanceAcordado: propuesta.alcance },
    });
  });

  return serializar(await obtenerServicioPorId(servicio.id), usuario.rol);
}

async function rechazarPropuesta(usuario, id, motivo) {
  await expirarPendientes();

  const servicio = await obtenerServicioParaActor(usuario, id);
  if (!ESTADOS_CON_PROPUESTA.includes(servicio.estado)) {
    throw new ApiError(409, "No se puede rechazar una propuesta en este estado");
  }

  const propuesta = await prisma.propuesta.findFirst({
    where: { servicioId: servicio.id, estado: "pendiente" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!propuesta) {
    throw new ApiError(404, "No hay una propuesta pendiente");
  }

  await prisma.propuesta.update({
    where: { id: propuesta.id },
    data: {
      estado: "rechazada",
      respondidaPorId: usuario.id,
      motivoRechazo: motivo ?? "Rechazada por el cliente",
    },
  });

  return serializar(await obtenerServicioPorId(servicio.id), usuario.rol);
}

async function obtenerServicioParaActor(usuario, id) {
  const servicio = await prisma.servicio.findUnique({
    where: { id },
    select: {
      id: true,
      estado: true,
      fechaHora: true,
      cliente: { select: { id: true } },
      tecnico: { select: { usuario: { select: { id: true } } } },
    },
  });

  if (!servicio) {
    throw new ApiError(404, "Solicitud no encontrada");
  }
  if (usuario.rol === "cliente" && servicio.cliente.id !== usuario.id) {
    throw new ApiError(404, "Solicitud no encontrada");
  }
  if (usuario.rol === "tecnico" && servicio.tecnico.usuario.id !== usuario.id) {
    throw new ApiError(404, "Solicitud no encontrada");
  }

  return servicio;
}

module.exports = {
  crearServicio,
  listarServicios,
  obtenerServicio,
  aceptar,
  rechazar,
  completar,
  cancelar,
  crearPropuesta,
  aceptarPropuesta,
  rechazarPropuesta,
  expirarPendientes,
};
