const { z } = require("zod");

const ESTADOS_SERVICIO = [
  "pendiente",
  "aceptado",
  "completado",
  "rechazado",
  "cancelado",
  "expirado",
];

const idPositivo = z.coerce
  .number("Id inválido")
  .int("Id inválido")
  .positive("Id inválido");

const paginacionQuery = z.object({
  page: z.coerce.number().int().min(1, "Página inválida").default(1),
  limit: z.coerce.number().int().min(1, "Límite inválido").optional(),
});

const crearResenaSchema = z.object({
  params: z.object({ id: idPositivo }),
  body: z.object({
    calificacion: z.coerce
      .number({ message: "La calificación es obligatoria" })
      .int("La calificación debe ser un número entero")
      .min(1, "La calificación debe estar entre 1 y 5")
      .max(5, "La calificación debe estar entre 1 y 5"),
    comentario: z
      .string()
      .trim()
      .max(500, "El comentario debe tener máximo 500 caracteres")
      .optional(),
  }),
});

const historialSchema = z.object({
  query: paginacionQuery.extend({
    estado: z.enum(ESTADOS_SERVICIO, { message: "Estado inválido" }).optional(),
  }),
});

const tecnicoResenasSchema = z.object({
  params: z.object({ id: idPositivo }),
  query: paginacionQuery,
});

module.exports = {
  crearResenaSchema,
  historialSchema,
  tecnicoResenasSchema,
  ESTADOS_SERVICIO,
};
