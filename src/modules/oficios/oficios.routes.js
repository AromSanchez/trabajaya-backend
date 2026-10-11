const { Router } = require("express");
const validate = require("../../middlewares/validate");
const { autenticar } = require("../../middlewares/auth");
const { especialidadesDeOficioSchema } = require("./oficios.schemas");
const controller = require("./oficios.controller");

const router = Router();

router.get(
  "/:id/especialidades",
  autenticar,
  validate(especialidadesDeOficioSchema),
  controller.especialidadesDeOficio,
);

module.exports = router;
