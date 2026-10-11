const adminService = require("./admin.service");

async function listarTecnicos(req, res) {
  const tecnicos = await adminService.listarTecnicos(req.validated.query);
  res.status(200).json({ data: { tecnicos } });
}

async function obtenerTecnico(req, res) {
  const tecnico = await adminService.obtenerTecnicoDetalle(req.validated.params.id);
  res.status(200).json({ data: { tecnico } });
}

async function marcarDocumento(req, res) {
  const documento = await adminService.marcarDocumento(
    req.usuario.id,
    req.validated.params.id,
    req.validated.params.documentoId,
    req.validated.body,
  );
  res.status(200).json({ data: { documento } });
}

async function aprobar(req, res) {
  const tecnico = await adminService.aprobar(
    req.usuario.id,
    req.validated.params.id,
    req.validated.body?.comentario,
  );
  res.status(200).json({ data: { tecnico } });
}

async function observar(req, res) {
  const tecnico = await adminService.observar(
    req.usuario.id,
    req.validated.params.id,
    req.validated.body?.comentario,
  );
  res.status(200).json({ data: { tecnico } });
}

async function rechazar(req, res) {
  const tecnico = await adminService.rechazar(
    req.usuario.id,
    req.validated.params.id,
    req.validated.body?.comentario,
  );
  res.status(200).json({ data: { tecnico } });
}

async function suspender(req, res) {
  const tecnico = await adminService.suspender(
    req.usuario.id,
    req.validated.params.id,
    req.validated.body.motivo,
  );
  res.status(200).json({ data: { tecnico } });
}

async function reactivar(req, res) {
  const tecnico = await adminService.reactivar(
    req.usuario.id,
    req.validated.params.id,
    req.validated.body.motivo,
  );
  res.status(200).json({ data: { tecnico } });
}

async function listarCancelacionesTardias(_req, res) {
  const usuarios = await adminService.listarCancelacionesTardias();
  res.status(200).json({ data: { usuarios } });
}

module.exports = {
  listarTecnicos,
  obtenerTecnico,
  marcarDocumento,
  aprobar,
  observar,
  rechazar,
  suspender,
  reactivar,
  listarCancelacionesTardias,
};
