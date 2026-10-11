const favoritosService = require("./favoritos.service");

async function marcar(req, res) {
  const favorito = await favoritosService.marcar(
    req.usuario.id,
    req.validated.params.tecnicoId,
  );
  res.status(200).json({ data: { favorito } });
}

async function desmarcar(req, res) {
  await favoritosService.desmarcar(req.usuario.id, req.validated.params.tecnicoId);
  res.status(204).send();
}

async function listar(req, res) {
  const resultado = await favoritosService.listar(req.usuario.id, req.validated.query);
  res.status(200).json({ data: resultado });
}

module.exports = { marcar, desmarcar, listar };
