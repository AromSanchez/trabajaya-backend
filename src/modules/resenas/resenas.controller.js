const resenasService = require("./resenas.service");

async function crear(req, res) {
  const resena = await resenasService.crearResena(
    req.usuario,
    req.validated.params.id,
    req.validated.body,
  );
  res.status(201).json({ data: { resena } });
}

async function listarPublicas(req, res) {
  const resultado = await resenasService.listarResenasPublicas(
    req.validated.params.id,
    req.validated.query,
  );
  res.status(200).json({ data: resultado });
}

async function historial(req, res) {
  const resultado = await resenasService.historial(req.usuario, req.validated.query);
  res.status(200).json({ data: resultado });
}

module.exports = { crear, listarPublicas, historial };
