require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const bcrypt = require("bcrypt");
const prisma = require("../src/config/prisma");
const {
  subirPrivado,
  eliminarArchivo,
  CARPETA_VERIFICACION,
} = require("../src/config/cloudinary");

const SALT_ROUNDS = 10;
const PASSWORD = "123456";
const IMAGEN = process.env.DNI_IMAGE || path.join(__dirname, "dni-prueba.jpg");
const TIPOS_DOCUMENTO = ["dni_frente", "dni_reverso", "selfie"];

const DISPONIBILIDAD = [
  { dia: "lunes", desde: "08:00", hasta: "18:00" },
  { dia: "martes", desde: "08:00", hasta: "18:00" },
  { dia: "miercoles", desde: "08:00", hasta: "18:00" },
  { dia: "jueves", desde: "08:00", hasta: "18:00" },
  { dia: "viernes", desde: "08:00", hasta: "18:00" },
  { dia: "sabado", desde: "09:00", hasta: "14:00" },
];

const ESPECIALIDADES = {
  electricidad: ["Instalaciones eléctricas", "Tableros eléctricos"],
  pintura: ["Pintura de interiores", "Empastado"],
  carpinteria: ["Muebles a medida", "Puertas"],
  albanileria: ["Tarrajado", "Pisos"],
  gasfiteria: ["Instalación de tuberías", "Fugas"],
};

// Albañilería y gasfitería repartidos 2 y 2.
const TECNICOS = [
  { nombre: "Jair Iglesias", oficio: "electricidad", anios: 9 },
  { nombre: "Edwin Iglesias", oficio: "electricidad", anios: 6 },
  { nombre: "Ramon", oficio: "electricidad", anios: 4 },
  { nombre: "Luis Mendoza", oficio: "electricidad", anios: 12 },
  { nombre: "Santiago Jara", oficio: "pintura", anios: 8 },
  { nombre: "Marco Jimenez", oficio: "pintura", anios: 5 },
  { nombre: "Erick", oficio: "pintura", anios: 3 },
  { nombre: "Abel Tumbajulca", oficio: "pintura", anios: 10 },
  { nombre: "Javier", oficio: "pintura", anios: 7 },
  { nombre: "Omar", oficio: "carpinteria", anios: 11 },
  { nombre: "Jara", oficio: "carpinteria", anios: 6 },
  { nombre: "Milton Giorgio", oficio: "carpinteria", anios: 9 },
  { nombre: "Jose Murga", oficio: "albanileria", anios: 13 },
  { nombre: "José Parimango", oficio: "gasfiteria", anios: 8 },
  { nombre: "Javier", oficio: "albanileria", anios: 5 },
  { nombre: "Segundo Ramos", oficio: "gasfiteria", anios: 15 },
];

function primerNombre(nombre) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(" ")[0]
    .toLowerCase();
}

function emailDe(datos) {
  return `${primerNombre(datos.nombre)}.${datos.oficio}@trabajoya.com`;
}

function validarCloudinary() {
  const faltan = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ].filter((clave) => !process.env[clave]);

  if (faltan.length > 0) {
    throw new Error(
      `Faltan variables de Cloudinary en .env: ${faltan.join(", ")}`,
    );
  }
}

async function limpiarDocumentos(tecnicoId) {
  const previos = await prisma.documentoVerificacion.findMany({
    where: { tecnicoId },
    select: { publicId: true, resourceType: true },
  });

  if (previos.length === 0) return 0;

  await prisma.documentoVerificacion.deleteMany({ where: { tecnicoId } });

  const unicos = new Map(previos.map((doc) => [doc.publicId, doc.resourceType]));
  for (const [publicId, resourceType] of unicos) {
    try {
      await eliminarArchivo(publicId, resourceType);
    } catch (error) {
      console.warn(`  Aviso: no se pudo borrar ${publicId} de Cloudinary (${error.message})`);
    }
  }

  return previos.length;
}

async function main() {
  validarCloudinary();

  if (!fs.existsSync(IMAGEN)) {
    throw new Error(`No se encontró la imagen de prueba: ${IMAGEN}`);
  }

  const buffer = fs.readFileSync(IMAGEN);
  const nombreOriginal = path.basename(IMAGEN);
  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  console.log(`Sembrando ${TECNICOS.length} técnicos en "${process.env.DATABASE_URL?.split("@")[1] ?? "BD"}":`);

  let documentosCreados = 0;

  for (const datos of TECNICOS) {
    const email = emailDe(datos);

    const usuario = await prisma.usuario.upsert({
      where: { email },
      update: { nombre: datos.nombre, rol: "tecnico", passwordHash },
      create: {
        email,
        passwordHash,
        nombre: datos.nombre,
        rol: "tecnico",
      },
    });

    const perfil = {
      oficio: datos.oficio,
      descripcion: `${datos.nombre} — especialista en ${datos.oficio}`,
      aniosExperiencia: datos.anios,
      distritos: ["trujillo"],
      disponibilidad: DISPONIBILIDAD,
      especialidades: ESPECIALIDADES[datos.oficio],
      disponible: true,
      estadoVerificacion: "en_revision",
      documentosEnviadosAt: new Date(),
    };

    const tecnico = await prisma.tecnico.upsert({
      where: { usuarioId: usuario.id },
      update: perfil,
      create: { usuarioId: usuario.id, ...perfil },
    });

    await limpiarDocumentos(tecnico.id);

    const subida = await subirPrivado(
      buffer,
      `${CARPETA_VERIFICACION}/${tecnico.id}/verificacion`,
    );

    for (const tipo of TIPOS_DOCUMENTO) {
      await prisma.documentoVerificacion.create({
        data: {
          tecnicoId: tecnico.id,
          tipo,
          estado: "pendiente",
          publicId: subida.public_id,
          resourceType: subida.resource_type,
          formato: subida.format,
          nombreOriginal,
          bytes: subida.bytes,
        },
      });
      documentosCreados += 1;
    }

    console.log(
      `  OK ${datos.nombre} | ${datos.oficio} | ${email} | ${datos.anios} años | 3 documentos`,
    );
  }

  console.log("\nSeed de técnicos completado:");
  console.log(`  Técnicos: ${TECNICOS.length} (todos en_revision)`);
  console.log(`  Documentos: ${documentosCreados}`);
  console.log(`  Contraseña: ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Error en el seed de técnicos:", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
