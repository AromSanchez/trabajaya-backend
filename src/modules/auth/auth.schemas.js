const { z } = require("zod");

const registroSchema = z.object({
  body: z.object({
    email: z.email("Correo electrónico inválido").max(255, "El correo es demasiado largo"),
    password: z
      .string("La contraseña es obligatoria")
      .min(6, "La contraseña debe tener al menos 6 caracteres")
      .max(72, "La contraseña es demasiado larga"),
    nombre: z
      .string("El nombre es obligatorio")
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(100, "El nombre es demasiado largo"),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.email("Correo electrónico inválido"),
    password: z.string("La contraseña es obligatoria").min(1, "La contraseña es obligatoria"),
  }),
});

module.exports = { registroSchema, loginSchema };