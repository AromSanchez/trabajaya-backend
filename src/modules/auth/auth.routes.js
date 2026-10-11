const { Router } = require("express");
const validate = require("../../middlewares/validate");
const { autenticar } = require("../../middlewares/auth");
const { registroSchema, loginSchema } = require("./auth.schemas");
const controller = require("./auth.controller");

const router = Router();

router.post("/cliente/registro", validate(registroSchema), controller.registrarCliente);
router.post("/cliente/login", validate(loginSchema), controller.loginCliente);

router.post("/tecnico/registro", validate(registroSchema), controller.registrarTecnico);
router.post("/tecnico/login", validate(loginSchema), controller.loginTecnico);

router.post("/admin/login", validate(loginSchema), controller.loginAdmin);

router.get("/perfil", autenticar, controller.perfil);

module.exports = router;