const { z } = require("zod");

const idPositivo = z.coerce
  .number("Id inválido")
  .int("Id inválido")
  .positive("Id inválido");

const listarNotificacionesSchema = z.object({
  query: z.object({
    leida: z
      .enum(["true", "false"], { message: "Filtro inválido" })
      .transform((valor) => valor === "true")
      .optional(),
    page: z.coerce.number().int().min(1, "Página inválida").default(1),
    limit: z.coerce.number().int().min(1, "Límite inválido").optional(),
  }),
});

const notificacionIdSchema = z.object({
  params: z.object({ id: idPositivo }),
});

module.exports = { listarNotificacionesSchema, notificacionIdSchema };
