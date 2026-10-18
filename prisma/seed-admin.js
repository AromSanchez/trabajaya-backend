require("dotenv").config();
const bcrypt = require("bcrypt");
const prisma = require("../src/config/prisma");

const SALT_ROUNDS = 10;

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@trabajaya.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "123456";
  const nombre = process.env.ADMIN_NOMBRE || "Administrador";
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const admin = await prisma.usuario.upsert({
    where: { email },
    update: { passwordHash, nombre, rol: "admin" },
    create: { email, passwordHash, nombre, rol: "admin" },
  });

  console.log(`Admin listo: ${admin.email} (id ${admin.id})`);

  await prisma.configuracion.upsert({
    where: { clave: "comision_porcentaje" },
    update: {},
    create: { clave: "comision_porcentaje", valor: "0" },
  });

  console.log("Configuración lista: comision_porcentaje = 0");
}

main()
  .catch((error) => {
    console.error("No se pudo crear el admin:", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
