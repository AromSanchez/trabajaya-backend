const jwt = require("jsonwebtoken");
const ApiError = require("../config/ApiError");

function autenticar(req, _res, next) {
  const encabezado = req.headers.authorization || "";
  const [tipo, token] = encabezado.split(" ");

  if (tipo !== "Bearer" || !token) {
    return next(new ApiError(401, "No autenticado"));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id: payload.sub, rol: payload.rol };
    return next();
  } catch {
    return next(new ApiError(401, "Token inválido o expirado"));
  }
}

function autorizar(...rolesPermitidos) {
  return (req, _res, next) => {
    if (!req.usuario) {
      return next(new ApiError(401, "No autenticado"));
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return next(new ApiError(403, "No tienes permiso para esta acción"));
    }

    return next();
  };
}

module.exports = { autenticar, autorizar };
