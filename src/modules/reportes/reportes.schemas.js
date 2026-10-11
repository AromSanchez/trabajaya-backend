const { z } = require("zod");

const TIPOS_OBJETIVO = ["tecnico", "cliente", "resena"];

const CATEGORIAS = [
  "no_se_presento",
  "no_estaba",
  "trabajo_deficiente",
  "cobro_diferente",
  "comportamiento_inapropiado",
  "fraude",
  "contenido_inapropiado",
  "otro",
];

const ESTADOS_REPORTE = ["pendiente", "resuelto", "descartado"];
const ESTADOS_RESOLUCION = ["resuelto", "descartado"];

const idPositivo = z.coerce
  .number("Id inválido")
  .int("Id inválido")
  .positive("Id inválido");

const paginacionQuery = z.object({
  page: z.coerce.number().int().min(1, "Página inválida").default(1),
  limit: z.coerce.number().int().min(1, "Límite inválido").optional(),
});

const crearReporteSchema = z.object({
  body: z.object({
    tipo_objetivo: z.enum(TIPOS_OBJETIVO, { message: "Tipo de objetivo inválido" }),
    servicio_id: idPositivo.optional(),
    resena_id: idPositivo.optional(),
    categoria: z.enum(CATEGORIAS, { message: "Categoría inválida" }),
    comentario: z
      .string()
      .trim()
      .max(500, "El comentario debe tener máximo 500 caracteres")
      .optional(),
  }),
});

const listarReportesSchema = z.object({
  query: paginacionQuery.extend({
    estado: z.enum(ESTADOS_REPORTE, { message: "Estado inválido" }).optional(),
    tipo_objetivo: z.enum(TIPOS_OBJETIVO, { message: "Tipo de objetivo inválido" }).optional(),
    categoria: z.enum(CATEGORIAS, { message: "Categoría inválida" }).optional(),
  }),
});

const reporteIdSchema = z.object({
  params: z.object({ id: idPositivo }),
});

const actualizarReporteSchema = z.object({
  params: z.object({ id: idPositivo }),
  body: z.object({
    estado: z.enum(ESTADOS_RESOLUCION, { message: "Estado inválido" }),
    nota: z
      .string({ message: "La nota es obligatoria" })
      .trim()
      .min(1, "La nota es obligatoria")
      .max(500, "La nota debe tener máximo 500 caracteres"),
  }),
});

module.exports = {
  crearReporteSchema,
  listarReportesSchema,
  reporteIdSchema,
  actualizarReporteSchema,
  TIPOS_OBJETIVO,
  CATEGORIAS,
  ESTADOS_REPORTE,
};
