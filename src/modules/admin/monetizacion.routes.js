const { Router } = require("express");
const validate = require("../../middlewares/validate");
const { autenticar, autorizar } = require("../../middlewares/auth");
const {
  listarTecnicosMonetizacionSchema,
  listarTransaccionesMonetizacionSchema,
} = require("./monetizacion.schemas");
const controller = require("./monetizacion.controller");

const router = Router();

const soloAdmin = [autenticar, autorizar("admin")];

router.get(
  "/resumen",
  ...soloAdmin,
  controller.resumenMonetizacion
);

router.get(
  "/tecnicos",
  ...soloAdmin,
  validate(listarTecnicosMonetizacionSchema),
  controller.listarTecnicosMonetizacion
);

router.get(
  "/transacciones",
  ...soloAdmin,
  validate(listarTransaccionesMonetizacionSchema),
  controller.listarTransaccionesMonetizacion
);

module.exports = router;