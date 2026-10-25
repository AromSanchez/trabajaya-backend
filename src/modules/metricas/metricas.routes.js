const { Router } = require("express");
const validate = require("../../middlewares/validate");
const { autenticar, autorizar } = require("../../middlewares/auth");
const { dashboardSchema, monetizacionSchema } = require("./metricas.schemas");
const controller = require("./metricas.controller");

const router = Router();

router.use(autenticar, autorizar("admin"));

router.get("/dashboard", validate(dashboardSchema), controller.obtenerDashboard);
router.get("/monetizacion", validate(monetizacionSchema), controller.obtenerMonetizacion);

module.exports = router;
