const tecnicosService = require("./tecnicos.service");

async function obtenerPerfil(req, res) {
  const perfil = await tecnicosService.obtenerPerfil(req.usuario.id);
  res.status(200).json({ data: { perfil } });
}

async function actualizarPerfil(req, res) {
  const perfil = await tecnicosService.actualizarPerfil(req.usuario.id, req.validated.body);
  res.status(200).json({ data: { perfil } });
}

async function listarDocumentos(req, res) {
  const documentos = await tecnicosService.listarDocumentos(req.usuario.id);
  res.status(200).json({ data: { documentos } });
}

async function subirDocumento(req, res) {
  const documento = await tecnicosService.subirDocumento(
    req.usuario.id,
    req.validated.params.tipo,
    req.file,
  );
  res.status(201).json({ data: { documento } });
}

async function eliminarDocumento(req, res) {
  await tecnicosService.eliminarDocumento(req.usuario.id, req.validated.params.id);
  res.status(204).send();
}

async function enviarARevision(req, res) {
  const resultado = await tecnicosService.enviarARevision(req.usuario.id);
  res.status(200).json({ data: resultado });
}

module.exports = {
  obtenerPerfil,
  actualizarPerfil,
  listarDocumentos,
  subirDocumento,
  eliminarDocumento,
  enviarARevision,
};
