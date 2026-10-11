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

const propuestaSchema = z.object({
  params: z.object({ id: idPositivo }),
  body: z.object({
    monto: z.coerce
      .number({ message: "El monto es obligatorio" })
      .positive("El monto debe ser mayor que 0")
      .max(100000, "El monto es demasiado alto"),
    alcance: z
      .string({ message: "El alcance es obligatorio" })
      .trim()
      .min(1, "El alcance es obligatorio")
      .max(1000, "El alcance debe tener máximo 1000 caracteres"),
  }),
});

const propuestaRechazarSchema = z.object({
  params: z.object({ id: idPositivo }),
  body: z.object({
    motivo: z
      .string()
      .trim()
      .min(1, "El motivo no puede estar vacío")
      .max(500, "El motivo es demasiado largo")
      .optional(),
  }),
});

module.exports = {
  crearServicioSchema,
  servicioIdSchema,
  motivoSchema,
  propuestaSchema,
  propuestaRechazarSchema,
  FOTOS_MAX,
};
