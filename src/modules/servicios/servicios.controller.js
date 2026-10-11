const serviciosService = require("./servicios.service");

async function crear(req, res) {
  const servicio = await serviciosService.crearServicio(
    req.usuario.id,
    req.validated.body,
    req.files,
  );
  res.status(201).json({ data: { servicio } });
}

async function listar(req, res) {
  const servicios = await serviciosService.listarServicios(req.usuario);
  res.status(200).json({ data: { servicios } });
}

async function obtener(req, res) {
  const servicio = await serviciosService.obtenerServicio(req.usuario, req.validated.params.id);
  res.status(200).json({ data: { servicio } });
}

async function aceptar(req, res) {
  const servicio = await serviciosService.aceptar(req.usuario.id, req.validated.params.id);
  res.status(200).json({ data: { servicio } });
}

async function rechazar(req, res) {
  const servicio = await serviciosService.rechazar(
    req.usuario.id,
    req.validated.params.id,
    req.validated.body.motivo,
  );
  res.status(200).json({ data: { servicio } });
}

async function completar(req, res) {
  const servicio = await serviciosService.completar(req.usuario, req.validated.params.id);
  res.status(200).json({ data: { servicio } });
}

async function cancelar(req, res) {
  const servicio = await serviciosService.cancelar(
    req.usuario,
    req.validated.params.id,
    req.validated.body.motivo,
  );
  res.status(200).json({ data: { servicio } });
}

async function crearPropuesta(req, res) {
  const servicio = await serviciosService.crearPropuesta(
    req.usuario.id,
    req.validated.params.id,
    req.validated.body,
  );
  res.status(201).json({ data: { servicio } });
}

async function aceptarPropuesta(req, res) {
  const servicio = await serviciosService.aceptarPropuesta(req.usuario, req.validated.params.id);
  res.status(200).json({ data: { servicio } });
}

async function rechazarPropuesta(req, res) {
  const servicio = await serviciosService.rechazarPropuesta(
    req.usuario,
    req.validated.params.id,
    req.validated.body.motivo,
  );
  res.status(200).json({ data: { servicio } });
}

module.exports = {
  crear,
  listar,
  obtener,
  aceptar,
  rechazar,
  completar,
  cancelar,
  crearPropuesta,
  aceptarPropuesta,
  rechazarPropuesta,
};
