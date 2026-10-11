const reportesService = require("./reportes.service");

async function crear(req, res) {
  const reporte = await reportesService.crearReporte(req.usuario, req.validated.body);
  res.status(201).json({ data: { reporte } });
}

async function listar(req, res) {
  const resultado = await reportesService.listarReportes(req.validated.query);
  res.status(200).json({ data: resultado });
}

async function obtener(req, res) {
  const reporte = await reportesService.obtenerReporte(req.validated.params.id);
  res.status(200).json({ data: { reporte } });
}

async function resolver(req, res) {
  const reporte = await reportesService.resolverReporte(
    req.usuario.id,
    req.validated.params.id,
    req.validated.body,
  );
  res.status(200).json({ data: { reporte } });
}

module.exports = { crear, listar, obtener, resolver };
