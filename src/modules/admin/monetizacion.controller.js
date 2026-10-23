const service = require("./monetizacion.service");

async function listarTecnicosMonetizacion(req, res) {
  const resultado = await service.listarTecnicosMonetizacion(req.validated.query);
  res.status(200).json({ data: resultado });
}

async function listarTransaccionesMonetizacion(req, res) {
  const resultado = await service.listarTransaccionesMonetizacion(req.validated.query);
  res.status(200).json({ data: resultado });
}

async function resumenMonetizacion(_req, res) {
  const resultado = await service.resumenMonetizacion();
  res.status(200).json({ data: resultado });
}

module.exports = {
  listarTecnicosMonetizacion,
  listarTransaccionesMonetizacion,
  resumenMonetizacion,
};