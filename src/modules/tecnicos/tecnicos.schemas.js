const { z } = require("zod");

const OFICIOS = ["gasfiteria", "electricidad", "carpinteria", "albanileria", "pintura"];
const DISTRITOS = [
  "trujillo",
  "el_porvenir",
  "florencia_de_mora",
  "huanchaco",
  "la_esperanza",
  "laredo",
  "moche",
  "poroto",
  "salaverry",
  "simbal",
  "victor_larco_herrera",
];
const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

const horaRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const disponibilidadSchema = z
  .array(
    z
      .object({
        dia: z.enum(DIAS, { message: "Día inválido" }),
        desde: z.string().regex(horaRegex, "La hora de inicio debe tener formato HH:MM"),
        hasta: z.string().regex(horaRegex, "La hora de fin debe tener formato HH:MM"),
      })
      .refine((rango) => rango.desde < rango.hasta, {
        message: "La hora de fin debe ser mayor que la hora de inicio",
      }),
  )
  .min(1, "Agrega al menos un día de disponibilidad")
  .refine((rangos) => new Set(rangos.map((r) => r.dia)).size === rangos.length, {
    message: "No repitas el mismo día en la disponibilidad",
  });

const actualizarPerfilSchema = z.object({
  body: z.object({
    oficio: z.enum(OFICIOS, { message: "Oficio inválido" }),
    descripcion: z
      .string()
      .trim()
      .max(1000, "La descripción es demasiado larga")
      .optional(),
    aniosExperiencia: z
      .number("Los años de experiencia son obligatorios")
      .int("Los años de experiencia deben ser un número entero")
      .min(0, "Los años de experiencia no pueden ser negativos")
      .max(70, "Los años de experiencia no son válidos"),
    distritos: z
      .array(z.enum(DISTRITOS, { message: "Distrito inválido" }))
      .min(1, "Selecciona al menos un distrito")
      .max(DISTRITOS.length),
    disponibilidad: disponibilidadSchema,
  }),
});

module.exports = { actualizarPerfilSchema, OFICIOS, DISTRITOS, DIAS };
