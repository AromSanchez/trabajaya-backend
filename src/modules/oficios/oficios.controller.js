const oficiosService = require("./oficios.service");

function especialidadesDeOficio(req, res) {
  const oficio = req.validated.params.id;
  const especialidades = oficiosService.especialidadesDeOficio(oficio);
  res.status(200).json({ data: { oficio, especialidades } });
}

module.exports = { especialidadesDeOficio };
