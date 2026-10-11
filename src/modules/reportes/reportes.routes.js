const { Router } = require("express");
const validate = require("../../middlewares/validate");
const { autenticar, autorizar } = require("../../middlewares/auth");
const {
  crearReporteSchema,
  listarReportesSchema,
  reporteIdSchema,
  actualizarReporteSchema,
} = require("./reportes.schemas");
const controller = require("./reportes.controller");

const router = Router();
router.use(autenticar, autorizar("cliente", "tecnico"));
router.post("/", validate(crearReporteSchema), controller.crear);

const admin = Router();
admin.use(autenticar, autorizar("admin"));
admin.get("/reportes", validate(listarReportesSchema), controller.listar);
admin.get("/reportes/:id", validate(reporteIdSchema), controller.obtener);
admin.patch("/reportes/:id", validate(actualizarReporteSchema), controller.resolver);

module.exports = { router, admin };
