const prisma = require("../../config/prisma");
const ApiError = require("../../config/ApiError");

const LIMITE_POR_DEFECTO = 20;
const LIMITE_MAXIMO = 100;

async function obtenerConfiguracion() {
  const claves = [
    "creditos_paquetes",
    "creditos_costo_por_solicitud",
    "plan_mensual_precio",
    "plan_mensual_comision_porcentaje",
    "plan_mensual_duracion_dias",
  ];

  const configs = await prisma.configuracion.findMany({
    where: { clave: { in: claves } },
  });

  const config = {};
  for (const c of configs) {
    config[c.clave] = c.valor;
  }

  return {
    paquetes: JSON.parse(config.creditos_paquetes || "[]"),
    costoPorSolicitud: parseInt(config.creditos_costo_por_solicitud || "1", 10),
    planPrecio: parseFloat(config.plan_mensual_precio || "150"),
    planComisionPorcentaje: parseFloat(config.plan_mensual_comision_porcentaje || "5"),
    planDuracionDias: parseInt(config.plan_mensual_duracion_dias || "30", 10),
  };
}

function validarPaquete(paquetes, paqueteId) {
  const paquete = paquetes.find((p) => p.id === paqueteId);
  if (!paquete) {
    throw new ApiError(400, "Paquete de créditos no válido");
  }
  return paquete;
}

async function obtenerMonetizacion(usuarioId) {
  const tecnico = await prisma.tecnico.findUnique({
    where: { usuarioId },
    select: { id: true },
  });

  if (!tecnico) {
    throw new ApiError(404, "Perfil de técnico no encontrado");
  }

  const monetizacion = await prisma.monetizacionTecnico.findUnique({
    where: { tecnicoId: tecnico.id },
    select: {
      id: true,
      tipo: true,
      creditosRestantes: true,
      planVenceAt: true,
      paqueteId: true,
      planId: true,
    },
  });

  if (!monetizacion) {
    return { tipo: null, creditosRestantes: 0, planVenceAt: null, paqueteId: null, planId: null };
  }

  return monetizacion;
}

async function obtenerModeloActivo(req, res) {
  const monetizacion = await obtenerMonetizacion(req.usuario.id);
  res.status(200).json({ data: { modelo: monetizacion } });
}

async function comprarCreditos(req, res) {
  const { paqueteId } = req.validated.body;

  const config = await obtenerConfiguracion();
  const paquete = validarPaquete(config.paquetes, paqueteId);

  const tecnico = await prisma.tecnico.findUnique({
    where: { usuarioId: req.usuario.id },
    select: { id: true },
  });

  if (!tecnico) {
    throw new ApiError(404, "Perfil de técnico no encontrado");
  }

  const resultado = await prisma.$transaction(async (tx) => {
    let monetizacion = await tx.monetizacionTecnico.findUnique({
      where: { tecnicoId: tecnico.id },
    });

    if (monetizacion) {
      monetizacion = await tx.monetizacionTecnico.update({
        where: { tecnicoId: tecnico.id },
        data: {
          tipo: "creditos",
          creditosRestantes: { increment: paquete.creditos },
          paqueteId,
        },
      });
    } else {
      monetizacion = await tx.monetizacionTecnico.create({
        data: {
          tecnicoId: tecnico.id,
          tipo: "creditos",
          creditosRestantes: paquete.creditos,
          paqueteId,
        },
      });
    }

    await tx.transaccionMonetizacion.create({
      data: {
        tecnicoId: tecnico.id,
        monetizacionId: monetizacion.id,
        tipo: "compra_creditos",
        monto: paquete.precio,
        creditos: paquete.creditos,
        descripcion: `Compra de paquete "${paquete.nombre}"`,
        referenciaId: paqueteId,
      },
    });

    return monetizacion;
  });

  res.status(200).json({
    data: {
      mensaje: "Créditos acreditados correctamente",
      creditosRestantes: resultado.creditosRestantes,
      paquete: paquete.nombre,
    },
  });
}

async function activarMensualidad(req, res) {
  const { planId } = req.validated.body;

  const config = await obtenerConfiguracion();

  if (planId !== "plan_mensual") {
    throw new ApiError(400, "Plan mensual no válido");
  }

  const tecnico = await prisma.tecnico.findUnique({
    where: { usuarioId: req.usuario.id },
    select: { id: true },
  });

  if (!tecnico) {
    throw new ApiError(404, "Perfil de técnico no encontrado");
  }

  const planVenceAt = new Date();
  planVenceAt.setDate(planVenceAt.getDate() + config.planDuracionDias);

  const resultado = await prisma.$transaction(async (tx) => {
    let monetizacion = await tx.monetizacionTecnico.findUnique({
      where: { tecnicoId: tecnico.id },
    });

    if (monetizacion) {
      monetizacion = await tx.monetizacionTecnico.update({
        where: { tecnicoId: tecnico.id },
        data: {
          tipo: "mensualidad",
          planVenceAt,
          planId,
          creditosRestantes: 0,
          paqueteId: null,
        },
      });
    } else {
      monetizacion = await tx.monetizacionTecnico.create({
        data: {
          tecnicoId: tecnico.id,
          tipo: "mensualidad",
          planVenceAt,
          planId,
          creditosRestantes: 0,
        },
      });
    }

    await tx.transaccionMonetizacion.create({
      data: {
        tecnicoId: tecnico.id,
        monetizacionId: monetizacion.id,
        tipo: "activacion_plan",
        monto: config.planPrecio,
        descripcion: "Activación de plan mensual",
        referenciaId: planId,
      },
    });

    return monetizacion;
  });

  res.status(200).json({
    data: {
      mensaje: "Plan mensual activado correctamente",
      planVenceAt: resultado.planVenceAt.toISOString(),
      precio: config.planPrecio,
    },
  });
}

async function cambiarModelo(req, res) {
  const { tipo, paqueteId, planId } = req.validated.body;

  const config = await obtenerConfiguracion();

  const tecnico = await prisma.tecnico.findUnique({
    where: { usuarioId: req.usuario.id },
    select: { id: true },
  });

  if (!tecnico) {
    throw new ApiError(404, "Perfil de técnico no encontrado");
  }

  const monetizacionActual = await prisma.monetizacionTecnico.findUnique({
    where: { tecnicoId: tecnico.id },
  });

  let nuevoCreditosRestantes = 0;
  let nuevoPlanVenceAt = null;
  let nuevoPaqueteId = null;
  let nuevoPlanId = null;
  let descripcionTransaccion = "";
  let paqueteObj = null;

  if (tipo === "creditos") {
    paqueteObj = validarPaquete(config.paquetes, paqueteId);
    nuevoCreditosRestantes = monetizacionActual?.tipo === "creditos"
      ? (monetizacionActual.creditosRestantes || 0) + paqueteObj.creditos
      : paqueteObj.creditos;
    nuevoPaqueteId = paqueteId;
    descripcionTransaccion = `Cambio a modelo créditos + compra de paquete "${paqueteObj.nombre}"`;
  } else {
    if (planId !== "plan_mensual") {
      throw new ApiError(400, "Plan mensual no válido");
    }
    const planVenceAt = new Date();
    planVenceAt.setDate(planVenceAt.getDate() + config.planDuracionDias);
    nuevoPlanVenceAt = planVenceAt;
    nuevoPlanId = planId;
    nuevoCreditosRestantes = 0;
    descripcionTransaccion = "Cambio a modelo mensualidad + activación de plan";
  }

  const resultado = await prisma.$transaction(async (tx) => {
    let monetizacion;
    if (monetizacionActual) {
      monetizacion = await tx.monetizacionTecnico.update({
        where: { tecnicoId: tecnico.id },
        data: {
          tipo,
          creditosRestantes: nuevoCreditosRestantes,
          planVenceAt: nuevoPlanVenceAt,
          paqueteId: nuevoPaqueteId,
          planId: nuevoPlanId,
        },
      });
    } else {
      monetizacion = await tx.monetizacionTecnico.create({
        data: {
          tecnicoId: tecnico.id,
          tipo,
          creditosRestantes: nuevoCreditosRestantes,
          planVenceAt: nuevoPlanVenceAt,
          paqueteId: nuevoPaqueteId,
          planId: nuevoPlanId,
        },
      });
    }

    await tx.transaccionMonetizacion.create({
      data: {
        tecnicoId: tecnico.id,
        monetizacionId: monetizacion.id,
        tipo: "cambio_modelo",
        monto: tipo === "creditos" ? (paqueteObj?.precio ?? 0) : config.planPrecio,
        creditos: tipo === "creditos" ? (monetizacionActual?.tipo === "creditos" ? (monetizacionActual.creditosRestantes || 0) + (paqueteObj?.creditos ?? 0) : paqueteObj?.creditos ?? 0) : null,
        descripcion: descripcionTransaccion,
        referenciaId: tipo === "creditos" ? paqueteId : planId,
      },
    });

    return monetizacion;
  });

  res.status(200).json({
    data: {
      mensaje: "Modelo de monetización actualizado correctamente",
      tipo: resultado.tipo,
      creditosRestantes: resultado.creditosRestantes,
      planVenceAt: resultado.planVenceAt?.toISOString() ?? null,
    },
  });
}

async function obtenerHistorial(req, res) {
  const { tipoTransaccion, desde, hasta, page = 1, limit = 20 } = req.validated.query;
  const limiteFinal = Math.min(limit, LIMITE_MAXIMO);

  const tecnico = await prisma.tecnico.findUnique({
    where: { usuarioId: req.usuario.id },
    select: { id: true },
  });

  if (!tecnico) {
    throw new ApiError(404, "Perfil de técnico no encontrado");
  }

  const where = { tecnicoId: tecnico.id };
  if (tipoTransaccion) where.tipo = tipoTransaccion;
  if (desde || hasta) {
    where.createdAt = {};
    if (desde) where.createdAt.gte = new Date(desde);
    if (hasta) where.createdAt.lte = new Date(hasta);
  }

  const [total, transacciones] = await prisma.$transaction([
    prisma.transaccionMonetizacion.count({ where }),
    prisma.transaccionMonetizacion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limiteFinal,
      take: limiteFinal,
      select: {
        id: true,
        tipo: true,
        monto: true,
        creditos: true,
        descripcion: true,
        referenciaId: true,
        createdAt: true,
      },
    }),
  ]);

  res.status(200).json({
    data: {
      transacciones,
      paginacion: {
        page,
        limit: limiteFinal,
        total,
        total_paginas: Math.ceil(total / limiteFinal),
      },
    },
  });
}

module.exports = {
  obtenerModeloActivo,
  comprarCreditos,
  activarMensualidad,
  cambiarModelo,
  obtenerHistorial,
  obtenerConfiguracion,
  obtenerMonetizacion,
};