const ApiError = require("../config/ApiError");

function notFound(_req, _res, next) {
  next(new ApiError(404, "Ruta no encontrada"));
}

function errorHandler(err, _req, res, _next) {
  if (err instanceof ApiError) {
    const cuerpo = { error: err.message };
    if (err.detalles) {
      cuerpo.detalles = err.detalles;
    }
    return res.status(err.status).json(cuerpo);
  }

  console.error(err);
  return res.status(500).json({ error: "Error interno del servidor" });
}

module.exports = { notFound, errorHandler };