const { z } = require("zod");

const ESTADOS_VERIFICACION = [
  "pendiente",
  "en_revision",
  "verificado",
  "observado",
  "rechazado",
  "suspendido",
];

const ESTADOS_DOCUMENTO = ["aprobado", "observado"];

const idPositivo = z.coerce
  .number("Id inválido")
  .int("Id inválido")
  .positive("Id inválido");

const listarTecnicosSchema = z.object({
  query: z.object({
    estado: z.enum(ESTADOS_VERIFICACION, { message: "Estado inválido" }).optional(),
  }),
});

const tecnicoIdSchema = z.object({
  params: z.object({ id: idPositivo }),
});

const marcarDocumentoSchema = z.object({
  params: z.object({ id: idPositivo, documentoId: idPositivo }),
  body: z.object({
    estado: z.enum(ESTADOS_DOCUMENTO, { message: "Estado inválido" }),
    comentario: z
      .string()
      .trim()
      .max(500, "El comentario es demasiado largo")
      .optional(),
  }),
});

const decisionSchema = z.object({
  params: z.object({ id: idPositivo }),
  body: z
    .object({
      comentario: z
        .string()
        .trim()
        .max(500, "El comentario es demasiado largo")
        .optional(),
    })
    .optional(),
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

const ocultarResenaSchema = z.object({
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
  listarTecnicosSchema,
  tecnicoIdSchema,
  marcarDocumentoSchema,
  decisionSchema,
  motivoSchema,
  ocultarResenaSchema,
  ESTADOS_VERIFICACION,
};
