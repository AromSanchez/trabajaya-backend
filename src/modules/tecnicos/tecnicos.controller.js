const tecnicosService = require("./tecnicos.service");

async function obtenerPerfil(req, res) {
  const perfil = await tecnicosService.obtenerPerfil(req.usuario.id);
  res.status(200).json({ data: { perfil } });
}

async function actualizarPerfil(req, res) {
  const perfil = await tecnicosService.actualizarPerfil(req.usuario.id, req.validated.body);
  res.status(200).json({ data: { perfil } });
}

module.exports = { obtenerPerfil, actualizarPerfil };
