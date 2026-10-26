const { z } = require("zod");

const enteroEnRango = (min, max, mensaje) =>
  z.coerce
    .number(mensaje)
    .int(mensaje)
    .min(min, mensaje)
    .max(max, mensaje);

const mesSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "mes inválido (formato YYYY-MM)")
  .optional();

const dashboardSchema = z.object({
  query: z.object({
    semanas_registros: enteroEnRango(1, 52, "semanas_registros inválido").default(12),
    semanas_cancelaciones: enteroEnRango(1, 52, "semanas_cancelaciones inválido").default(8),
    dias_reportes: enteroEnRango(1, 365, "dias_reportes inválido").default(30),
    limit_cola: enteroEnRango(1, 50, "limit_cola inválido").default(5),
    meses: z
      .union([z.literal(""), enteroEnRango(2, 12, "meses inválido")])
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
    mes: mesSchema,
  }),
});

const monetizacionSchema = z.object({
  query: z.object({
    semanas: enteroEnRango(1, 52, "semanas inválido").default(8),
    meses: z
      .union([z.literal(""), enteroEnRango(2, 12, "meses inválido")])
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
    mes: mesSchema,
  }),
});

module.exports = { dashboardSchema, monetizacionSchema };
