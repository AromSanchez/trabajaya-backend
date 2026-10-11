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

const TIPOS_DOCUMENTO = ["dni_frente", "dni_reverso", "selfie", "cul", "certificado_oficio"];
const DOCUMENTOS_OBLIGATORIOS = ["dni_frente", "dni_reverso", "selfie"];

const ESPECIALIDADES_MAX = 5;
const ESPECIALIDAD_LARGO_MAX = 40;

const horaRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const especialidadesSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, "La especialidad no puede estar vacía")
      .max(ESPECIALIDAD_LARGO_MAX, `Cada especialidad debe tener máximo ${ESPECIALIDAD_LARGO_MAX} caracteres`),
  )
  .max(ESPECIALIDADES_MAX, `Puedes agregar hasta ${ESPECIALIDADES_MAX} especialidades`)
  .refine((lista) => new Set(lista).size === lista.length, {
    message: "No repitas especialidades",
  });

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
    especialidades: especialidadesSchema.optional(),
    disponible: z.boolean({ message: "Disponible debe ser verdadero o falso" }).optional(),
  }),
});

const buscarTecnicosSchema = z.object({
  query: z.object({
    oficio: z.enum(OFICIOS, { message: "Oficio inválido" }).optional(),
    distrito: z.enum(DISTRITOS, { message: "Distrito inválido" }).optional(),
    nombre: z
      .string()
      .trim()
      .min(1, "El nombre no puede estar vacío")
      .max(100, "El nombre es demasiado largo")
      .optional(),
    page: z.coerce.number().int().min(1, "Página inválida").default(1),
    limit: z.coerce.number().int().min(1, "Límite inválido").optional(),
  }),
});

const perfilPublicoSchema = z.object({
  params: z.object({
    id: z.coerce.number("Id inválido").int("Id inválido").positive("Id inválido"),
  }),
});

const tipoDocumentoSchema = z.object({
  params: z.object({
    tipo: z.enum(TIPOS_DOCUMENTO, { message: "Tipo de documento inválido" }),
  }),
});

const documentoIdSchema = z.object({
  params: z.object({
    id: z.coerce.number("Id inválido").int("Id inválido").positive("Id inválido"),
  }),
});

module.exports = {
  actualizarPerfilSchema,
  buscarTecnicosSchema,
  perfilPublicoSchema,
  tipoDocumentoSchema,
  documentoIdSchema,
  OFICIOS,
  DISTRITOS,
  DIAS,
  TIPOS_DOCUMENTO,
  DOCUMENTOS_OBLIGATORIOS,
  ESPECIALIDADES_MAX,
  ESPECIALIDAD_LARGO_MAX,
};
