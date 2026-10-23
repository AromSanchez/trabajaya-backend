const { z } = require("zod");

const TIPOS_MONETIZACION = ["creditos", "mensualidad"];

const TIPOS_TRANSACCION = [
  "compra_creditos",
  "activacion_plan",
  "descuento_credito",
  "comision_servicio",
  "cambio_modelo",
];

const comprarCreditosSchema = z.object({
  body: z.object({
    paqueteId: z.string().min(1, "paqueteId es obligatorio"),
  }),
});

const activarMensualidadSchema = z.object({
  body: z.object({
    planId: z.string().min(1, "planId es obligatorio"),
  }),
});

const cambiarModeloSchema = z.object({
  body: z.object({
    tipo: z.enum(TIPOS_MONETIZACION, { message: "Tipo inválido. Debe ser 'creditos' o 'mensualidad'" }),
    paqueteId: z.string().optional(),
    planId: z.string().optional(),
  }).refine((data) => {
    if (data.tipo === "creditos" && !data.paqueteId) return false;
    if (data.tipo === "mensualidad" && !data.planId) return false;
    return true;
  }, {
    message: "Debes proporcionar paqueteId si eliges créditos, o planId si eliges mensualidad",
    path: ["paqueteId", "planId"],
  }),
});

const historialTransaccionesSchema = z.object({
  query: z.object({
    tipoTransaccion: z.enum(TIPOS_TRANSACCION, { message: "Tipo de transacción inválido" }).optional(),
    desde: z.string().datetime({ message: "Formato de fecha inválido (ISO 8601)" }).optional(),
    hasta: z.string().datetime({ message: "Formato de fecha inválido (ISO 8601)" }).optional(),
    page: z.coerce.number().int().min(1, "Página inválida").default(1),
    limit: z.coerce.number().int().min(1, "Límite inválido").max(100, "Máximo 100").default(20),
  }),
});

module.exports = {
  comprarCreditosSchema,
  activarMensualidadSchema,
  cambiarModeloSchema,
  historialTransaccionesSchema,
  TIPOS_MONETIZACION,
  TIPOS_TRANSACCION,
};