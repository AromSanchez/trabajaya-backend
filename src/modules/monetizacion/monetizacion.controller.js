const service = require("./monetizacion.service");

async function obtenerModeloActivo(req, res) {
  await service.obtenerModeloActivo(req, res);
}

async function comprarCreditos(req, res) {
  await service.comprarCreditos(req, res);
}

async function activarMensualidad(req, res) {
  await service.activarMensualidad(req, res);
}

async function cambiarModelo(req, res) {
  await service.cambiarModelo(req, res);
}

async function obtenerHistorial(req, res) {
  await service.obtenerHistorial(req, res);
}

module.exports = {
  obtenerModeloActivo,
  comprarCreditos,
  activarMensualidad,
  cambiarModelo,
  obtenerHistorial,
};