const { Router } = require("express");
const validate = require("../../middlewares/validate");
const { autenticar, autorizar } = require("../../middlewares/auth");
const {
  listarTecnicosSchema,
  tecnicoIdSchema,
  marcarDocumentoSchema,
  decisionSchema,
  motivoSchema,
  ocultarResenaSchema,
} = require("./admin.schemas");
const controller = require("./admin.controller");

const router = Router();

router.use(autenticar, autorizar("admin"));

router.get("/tecnicos", validate(listarTecnicosSchema), controller.listarTecnicos);
router.get("/tecnicos/:id", validate(tecnicoIdSchema), controller.obtenerTecnico);

router.get("/cancelaciones-tardias", controller.listarCancelacionesTardias);

router.patch(
  "/tecnicos/:id/documentos/:documentoId",
  validate(marcarDocumentoSchema),
  controller.marcarDocumento,
);

router.post("/tecnicos/:id/aprobar", validate(decisionSchema), controller.aprobar);
router.post("/tecnicos/:id/observar", validate(decisionSchema), controller.observar);
router.post("/tecnicos/:id/rechazar", validate(decisionSchema), controller.rechazar);
router.post("/tecnicos/:id/suspender", validate(motivoSchema), controller.suspender);
router.post("/tecnicos/:id/reactivar", validate(motivoSchema), controller.reactivar);

router.post("/resenas/:id/ocultar", validate(ocultarResenaSchema), controller.ocultarResena);

module.exports = router;
