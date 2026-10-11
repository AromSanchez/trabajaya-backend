const { Router } = require("express");
const validate = require("../../middlewares/validate");
const { autenticar, autorizar } = require("../../middlewares/auth");
const {
  listarNotificacionesSchema,
  notificacionIdSchema,
} = require("./notificaciones.schemas");
const controller = require("./notificaciones.controller");

const router = Router();

router.use(autenticar, autorizar("cliente", "tecnico"));

router.get("/", validate(listarNotificacionesSchema), controller.listar);
router.get("/no-leidas", controller.contarNoLeidas);
router.patch("/leer-todas", controller.marcarTodasLeidas);
router.patch("/:id/leer", validate(notificacionIdSchema), controller.marcarLeida);

module.exports = router;
