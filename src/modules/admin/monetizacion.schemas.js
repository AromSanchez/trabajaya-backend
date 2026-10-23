const { z } = require("zod");

const TIPOS_MONETIZACION = ["creditos", "mensualidad"];
const TIPOS_TRANSACCION = [
  "compra_creditos",
  "activacion_plan",
  "descuento_credito",
  "comision_servicio",
  "cambio_modelo",
];

const listarTecnicosMonetizacionSchema = z.object({
  query: z.object({
    tipo: z.enum(TIPOS_MONETIZACION, { message: "Tipo inválido" }).optional(),
    orden: z.enum(["recientes", "creditos", "vencimiento"], { message: "Orden inválido" }).default("recientes"),
    page: z.coerce.number().int().min(1, "Página inválida").default(1),
    limit: z.coerce.number().int().min(1, "Límite inválido").max(100, "Máximo 100").default(20),
  }),
});

const listarTransaccionesMonetizacionSchema = z.object({
  query: z.object({
    tecnicoId: z.coerce.number().int().positive("Id de técnico inválido").optional(),
    tipoTransaccion: z.enum(TIPOS_TRANSACCION, { message: "Tipo de transacción inválido" }).optional(),
    desde: z.string().datetime({ message: "Formato de fecha inválido (ISO 8601)" }).optional(),
    hasta: z.string().datetime({ message: "Formato de fecha inválido (ISO 8601)" }).optional(),
    page: z.coerce.number().int().min(1, "Página inválida").default(1),
    limit: z.coerce.number().int().min(1, "Límite inválido").max(100, "Máximo 100").default(20),
  }),
});

module.exports = {
  listarTecnicosMonetizacionSchema,
  listarTransaccionesMonetizacionSchema,
  TIPOS_MONETIZACION,
  TIPOS_TRANSACCION,
};