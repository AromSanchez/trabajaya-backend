require("dotenv").config();
const bcrypt = require("bcrypt");
const prisma = require("../src/config/prisma");

const SALT_ROUNDS = 10;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@trabajaya.com").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "341600";
const ADMIN_NOMBRE = process.env.ADMIN_NOMBRE || "Administrador";

const CLIENTES = [
  { nombre: "Arom Sanchez", email: "arom@gmail.com", password: "123456" },
  { nombre: "Carlos Caceres", email: "carlos@gmail.com", password: "123456" },
  { nombre: "Alan Roncal", email: "alan@gmail.com", password: "123456" },
  { nombre: "Mauricio Amando", email: "mauricio@gmail.com", password: "123456" },
];

async function asegurarAdmin() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
  return prisma.usuario.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash, nombre: ADMIN_NOMBRE, rol: "admin" },
    create: { email: ADMIN_EMAIL, passwordHash, nombre: ADMIN_NOMBRE, rol: "admin" },
  });
}

async function crearClientes() {
  const creados = [];
  for (const datos of CLIENTES) {
    const passwordHash = await bcrypt.hash(datos.password, SALT_ROUNDS);
    const usuario = await prisma.usuario.upsert({
      where: { email: datos.email },
      update: { nombre: datos.nombre, rol: "cliente", passwordHash },
      create: {
        email: datos.email,
        passwordHash,
        nombre: datos.nombre,
        rol: "cliente",
      },
    });
    creados.push(usuario.email);
  }
  return creados;
}

async function main() {
  const admin = await asegurarAdmin();
  console.log(`Admin listo: ${admin.email} (id ${admin.id})`);

  const clientes = await crearClientes();
  console.log(`Clientes listos (${clientes.length}): ${clientes.join(", ")}`);

  await prisma.configuracion.upsert({
    where: { clave: "comision_porcentaje" },
    update: {},
    create: { clave: "comision_porcentaje", valor: "0" },
  });
  console.log("Configuración lista: comision_porcentaje = 0");
}

main()
  .catch((error) => {
    console.error("Error en el seed de admin + clientes:", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
