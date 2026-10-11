const { z } = require("zod");

const idPositivo = z.coerce
  .number("Id inválido")
  .int("Id inválido")
  .positive("Id inválido");

const favoritoTecnicoSchema = z.object({
  params: z.object({ tecnicoId: idPositivo }),
});

const listarFavoritosSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1, "Página inválida").default(1),
    limit: z.coerce.number().int().min(1, "Límite inválido").optional(),
  }),
});

module.exports = { favoritoTecnicoSchema, listarFavoritosSchema };
