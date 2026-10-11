const { Router } = require("express");
const validate = require("../../middlewares/validate");
const { autenticar, autorizar } = require("../../middlewares/auth");
const { actualizarPerfilSchema } = require("./tecnicos.schemas");
const controller = require("./tecnicos.controller");

const router = Router();

router.use(autenticar, autorizar("tecnico"));

router.get("/perfil", controller.obtenerPerfil);
router.put("/perfil", validate(actualizarPerfilSchema), controller.actualizarPerfil);

module.exports = router;
