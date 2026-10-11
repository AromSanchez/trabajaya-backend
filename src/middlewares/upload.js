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

function subirArchivos(campo, maximo) {
  const cargador = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: TAMANO_MAXIMO_BYTES, files: maximo },
  });

  return (req, _res, next) => {
    cargador.array(campo, maximo)(req, _res, (error) => {
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return next(new ApiError(400, "Cada archivo debe pesar como máximo 5 MB"));
        }
        if (error.code === "LIMIT_UNEXPECTED_FILE" || error.code === "LIMIT_FILE_COUNT") {
          return next(new ApiError(400, `Puedes adjuntar hasta ${maximo} archivos`));
        }
        return next(new ApiError(400, "Archivos inválidos"));
      }
      if (error) {
        return next(error);
      }
      return next();
    });
  };
}

module.exports = { subirArchivo, subirArchivos, TAMANO_MAXIMO_BYTES };
