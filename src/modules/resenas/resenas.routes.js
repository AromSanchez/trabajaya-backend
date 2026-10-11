const { Router } = require("express");
const validate = require("../../middlewares/validate");
const { autenticar, autorizar } = require("../../middlewares/auth");
const {
  crearResenaSchema,
  historialSchema,
  tecnicoResenasSchema,
} = require("./resenas.schemas");
const controller = require("./resenas.controller");

const cliente = Router();
cliente.use(autenticar, autorizar("cliente"));
cliente.get("/servicios/historial", validate(historialSchema), controller.historial);
cliente.post("/servicios/:id/resena", validate(crearResenaSchema), controller.crear);

const tecnico = Router();
tecnico.use(autenticar, autorizar("tecnico"));
tecnico.get("/servicios/historial", validate(historialSchema), controller.historial);

const publicas = Router();
publicas.get(
  "/:id/resenas",
  autenticar,
  autorizar("cliente"),
  validate(tecnicoResenasSchema),
  controller.listarPublicas,
);

module.exports = { cliente, tecnico, publicas };
