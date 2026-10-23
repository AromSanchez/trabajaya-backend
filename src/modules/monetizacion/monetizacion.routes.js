const { Router } = require("express");
const validate = require("../../middlewares/validate");
const { autenticar, autorizar } = require("../../middlewares/auth");
const {
  comprarCreditosSchema,
  activarMensualidadSchema,
  cambiarModeloSchema,
  historialTransaccionesSchema,
} = require("./monetizacion.schemas");
const controller = require("./monetizacion.controller");

const router = Router();

const soloTecnico = [autenticar, autorizar("tecnico")];

router.get("/modelo", ...soloTecnico, controller.obtenerModeloActivo);

router.post(
  "/creditos/comprar",
  ...soloTecnico,
  validate(comprarCreditosSchema),
  controller.comprarCreditos
);

router.post(
  "/mensualidad/activar",
  ...soloTecnico,
  validate(activarMensualidadSchema),
  controller.activarMensualidad
);

router.post(
  "/cambiar",
  ...soloTecnico,
  validate(cambiarModeloSchema),
  controller.cambiarModelo
);

router.get(
  "/historial",
  ...soloTecnico,
  validate(historialTransaccionesSchema),
  controller.obtenerHistorial
);

module.exports = router;