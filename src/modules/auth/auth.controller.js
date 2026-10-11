const authService = require("./auth.service");

async function registrarCliente(req, res) {
  const { email, password, nombre } = req.validated.body;
  const resultado = await authService.registrarCliente({ email, password, nombre });
  res.status(201).json({ data: resultado });
}

async function registrarTecnico(req, res) {
  const { email, password, nombre } = req.validated.body;
  const resultado = await authService.registrarTecnico({ email, password, nombre });
  res.status(201).json({ data: resultado });
}

function loginDe(rol) {
  return async (req, res) => {
    const { email, password } = req.validated.body;
    const resultado = await authService.login({ email, password, rol });
    res.status(200).json({ data: resultado });
  };
}

async function perfil(req, res) {
  const resultado = await authService.obtenerPerfil(req.usuario.id);
  res.status(200).json({ data: resultado });
}

module.exports = {
  registrarCliente,
  registrarTecnico,
  loginCliente: loginDe("cliente"),
  loginTecnico: loginDe("tecnico"),
  loginAdmin: loginDe("admin"),
  perfil,
};