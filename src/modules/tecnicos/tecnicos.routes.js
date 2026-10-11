const { Router } = require("express");
const validate = require("../../middlewares/validate");
const { subirArchivo } = require("../../middlewares/upload");
const { autenticar, autorizar } = require("../../middlewares/auth");
const {
  actualizarPerfilSchema,
  tipoDocumentoSchema,
  documentoIdSchema,
} = require("./tecnicos.schemas");
const controller = require("./tecnicos.controller");

const router = Router();

router.use(autenticar, autorizar("tecnico"));

router.get("/perfil", controller.obtenerPerfil);
router.put("/perfil", validate(actualizarPerfilSchema), controller.actualizarPerfil);

router.get("/documentos", controller.listarDocumentos);
router.post(
  "/documentos/:tipo",
  validate(tipoDocumentoSchema),
  subirArchivo("archivo"),
  controller.subirDocumento,
);
router.delete("/documentos/:id", validate(documentoIdSchema), controller.eliminarDocumento);

router.post("/verificacion/enviar", controller.enviarARevision);

module.exports = router;
