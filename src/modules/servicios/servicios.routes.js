const { Router } = require("express");
const validate = require("../../middlewares/validate");
const { subirArchivos } = require("../../middlewares/upload");
const { autenticar, autorizar } = require("../../middlewares/auth");
const {
  crearServicioSchema,
  servicioIdSchema,
  motivoSchema,
  propuestaSchema,
  propuestaRechazarSchema,
  FOTOS_MAX,
} = require("./servicios.schemas");
const controller = require("./servicios.controller");

const router = Router();

router.use(autenticar);

router.post(
  "/",
  autorizar("cliente"),
  subirArchivos("fotos", FOTOS_MAX),
  validate(crearServicioSchema),
  controller.crear,
);

router.get("/", autorizar("cliente", "tecnico"), controller.listar);

router.post("/:id/aceptar", autorizar("tecnico"), validate(servicioIdSchema), controller.aceptar);
router.post("/:id/rechazar", autorizar("tecnico"), validate(motivoSchema), controller.rechazar);
router.post("/:id/completar", autorizar("cliente", "tecnico"), validate(servicioIdSchema), controller.completar);
router.post("/:id/cancelar", autorizar("cliente", "tecnico"), validate(motivoSchema), controller.cancelar);

router.post("/:id/propuesta", autorizar("tecnico"), validate(propuestaSchema), controller.crearPropuesta);
router.post("/:id/propuesta/aceptar", autorizar("cliente"), validate(servicioIdSchema), controller.aceptarPropuesta);
router.post("/:id/propuesta/rechazar", autorizar("cliente"), validate(propuestaRechazarSchema), controller.rechazarPropuesta);

router.get("/:id", autorizar("cliente", "tecnico", "admin"), validate(servicioIdSchema), controller.obtener);

module.exports = router;
