const { z } = require("zod");
const { OFICIOS } = require("./oficios.service");

const especialidadesDeOficioSchema = z.object({
  params: z.object({
    id: z.enum(OFICIOS, { message: "Oficio inválido" }),
  }),
});

module.exports = { especialidadesDeOficioSchema };
