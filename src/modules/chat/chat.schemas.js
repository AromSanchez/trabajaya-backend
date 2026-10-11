const { z } = require("zod");

const idPositivo = z.coerce
  .number("Id inválido")
  .int("Id inválido")
  .positive("Id inválido");

const mensajesListaSchema = z.object({
  params: z.object({ id: idPositivo }),
  query: z.object({
    page: z.coerce.number().int().min(1, "Página inválida").default(1),
    limit: z.coerce.number().int().min(1, "Límite inválido").optional(),
  }),
});

const mensajeEnviarSchema = z.object({
  params: z.object({ id: idPositivo }),
  body: z.object({
    contenido: z
      .string({ message: "El mensaje es obligatorio" })
      .trim()
      .min(1, "El mensaje no puede estar vacío")
      .max(1000, "El mensaje debe tener máximo 1000 caracteres"),
  }),
});

module.exports = { mensajesListaSchema, mensajeEnviarSchema };
