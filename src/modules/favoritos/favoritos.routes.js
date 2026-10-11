const { Router } = require("express");
const validate = require("../../middlewares/validate");
const { autenticar, autorizar } = require("../../middlewares/auth");
const { favoritoTecnicoSchema, listarFavoritosSchema } = require("./favoritos.schemas");
const controller = require("./favoritos.controller");

const router = Router();

router.use(autenticar, autorizar("cliente"));

router.get("/", validate(listarFavoritosSchema), controller.listar);
router.post("/:tecnicoId", validate(favoritoTecnicoSchema), controller.marcar);
router.delete("/:tecnicoId", validate(favoritoTecnicoSchema), controller.desmarcar);

module.exports = router;
