const { z } = require("zod");
const { DISTRITOS } = require("../tecnicos/tecnicos.schemas");

const FOTOS_MAX = 3;

const idPositivo = z.coerce
  .number("Id inválido")
  .int("Id inválido")
  .positive("Id inválido");

const crearServicioSchema = z.object({
  body: z.object({
    tecnico_id: z.coerce
      .number({ message: "El técnico es obligatorio" })
      .int("Técnico inválido")
      .positive("Técnico inválido"),
    descripcion: z
      .string({ message: "La descripción es obligatoria" })
      .trim()
      .min(1, "La descripción es obligatoria")
      .max(500, "La descripción debe tener máximo 500 caracteres"),
    fecha_hora: z.coerce.date({ message: "Fecha y hora inválidas" }),
    distrito: z.enum(DISTRITOS, { message: "Distrito inválido" }),
    direccion: z
      .string({ message: "La dirección es obligatoria" })
      .trim()
      .min(1, "La dirección es obligatoria")
      .max(300, "La dirección es demasiado larga"),
  }),
});

const servicioIdSchema = z.object({
  params: z.object({ id: idPositivo }),
});

const motivoSchema = z.object({
  params: z.object({ id: idPositivo }),
  body: z.object({
    motivo: z
      .string({ message: "El motivo es obligatorio" })
      .trim()
      .min(1, "El motivo es obligatorio")
      .max(500, "El motivo es demasiado largo"),
  }),
});

module.exports = {
  crearServicioSchema,
  servicioIdSchema,
  motivoSchema,
  FOTOS_MAX,
};
