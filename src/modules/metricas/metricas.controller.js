const metricasService = require("./metricas.service");

async function obtenerDashboard(req, res) {
  const dashboard = await metricasService.obtenerDashboard(req.validated.query);
  res.status(200).json({ data: dashboard });
}

async function obtenerMonetizacion(req, res) {
  const monetizacion = await metricasService.obtenerMonetizacion(req.validated.query);
  res.status(200).json({ data: monetizacion });
}

module.exports = { obtenerDashboard, obtenerMonetizacion };
