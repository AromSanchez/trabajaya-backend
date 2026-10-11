const { Router } = require("express");
const validate = require("../../middlewares/validate");
const { subirArchivo } = require("../../middlewares/upload");
const { autenticar, autorizar } = require("../../middlewares/auth");
const {
  actualizarPerfilSchema,
  buscarTecnicosSchema,
  perfilPublicoSchema,
  tipoDocumentoSchema,
  documentoIdSchema,
} = require("./tecnicos.schemas");
const controller = require("./tecnicos.controller");

const router = Router();

const soloTecnico = [autenticar, autorizar("tecnico")];
const soloCliente = [autenticar, autorizar("cliente")];

router.get("/", ...soloCliente, validate(buscarTecnicosSchema), controller.buscarTecnicos);

router.get("/perfil", ...soloTecnico, controller.obtenerPerfil);
router.put("/perfil", ...soloTecnico, validate(actualizarPerfilSchema), controller.actualizarPerfil);

router.get("/documentos", ...soloTecnico, controller.listarDocumentos);
router.post(
  "/documentos/:tipo",
  ...soloTecnico,
  validate(tipoDocumentoSchema),
  subirArchivo("archivo"),
  controller.subirDocumento,
);
router.delete("/documentos/:id", ...soloTecnico, validate(documentoIdSchema), controller.eliminarDocumento);

router.post("/verificacion/enviar", ...soloTecnico, controller.enviarARevision);

router.get("/:id", ...soloCliente, validate(perfilPublicoSchema), controller.obtenerPerfilPublico);

module.exports = router;
