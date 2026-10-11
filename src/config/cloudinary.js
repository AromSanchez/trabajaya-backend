require("dotenv").config();
const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const CARPETA_VERIFICACION = "trabajoya/tecnicos";

function subirPrivado(buffer, carpeta) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: carpeta, resource_type: "auto", type: "private" },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.end(buffer);
  });
}

function eliminarArchivo(publicId, resourceType) {
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    type: "private",
    invalidate: true,
  });
}

function urlPrivada(publicId, formato, resourceType) {
  return cloudinary.utils.private_download_url(publicId, formato, {
    resource_type: resourceType,
  });
}

module.exports = {
  cloudinary,
  subirPrivado,
  eliminarArchivo,
  urlPrivada,
  CARPETA_VERIFICACION,
};
