const metricasService = require("./metricas.service");

async function obtenerDashboard(req, res) {
  const dashboard = await metricasService.obtenerDashboard(req.validated.query);
  res.status(200).json({ data: dashboard });
}

module.exports = { obtenerDashboard };
