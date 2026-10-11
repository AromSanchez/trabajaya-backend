const notificacionesService = require("./notificaciones.service");

async function listar(req, res) {
  const resultado = await notificacionesService.listar(req.usuario.id, req.validated.query);
  res.status(200).json({ data: resultado });
}

async function contarNoLeidas(req, res) {
  const noLeidas = await notificacionesService.contarNoLeidas(req.usuario.id);
  res.status(200).json({ data: { noLeidas } });
}

async function marcarLeida(req, res) {
  const notificacion = await notificacionesService.marcarLeida(
    req.usuario.id,
    req.validated.params.id,
  );
  res.status(200).json({ data: { notificacion } });
}

async function marcarTodasLeidas(req, res) {
  const actualizadas = await notificacionesService.marcarTodasLeidas(req.usuario.id);
  res.status(200).json({ data: { actualizadas } });
}

module.exports = { listar, contarNoLeidas, marcarLeida, marcarTodasLeidas };
