const multer = require("multer");
const ApiError = require("../config/ApiError");

const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANO_MAXIMO_BYTES, files: 1 },
});

function subirArchivo(campo) {
  return (req, _res, next) => {
    upload.single(campo)(req, _res, (error) => {
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return next(new ApiError(400, "El archivo supera el tamaño máximo de 5 MB"));
        }
        return next(new ApiError(400, "Archivo inválido"));
      }
      if (error) {
        return next(error);
      }
      return next();
    });
  };
}

module.exports = { subirArchivo, TAMANO_MAXIMO_BYTES };
