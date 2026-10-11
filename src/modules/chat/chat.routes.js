const { Router } = require("express");
const validate = require("../../middlewares/validate");
const { autenticar, autorizar } = require("../../middlewares/auth");
const { mensajesListaSchema, mensajeEnviarSchema } = require("./chat.schemas");
const controller = require("./chat.controller");

const router = Router();

router.use(autenticar);

router.get(
  "/servicios/:id/mensajes",
  autorizar("cliente", "tecnico"),
  validate(mensajesListaSchema),
  controller.listar,
);

router.post(
  "/servicios/:id/mensajes",
  autorizar("cliente", "tecnico"),
  validate(mensajeEnviarSchema),
  controller.enviar,
);

module.exports = router;
