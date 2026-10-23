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

  const paquetesCreditos = JSON.stringify([
    { id: "paq_10", nombre: "10 créditos", creditos: 10, precio: 50 },
    { id: "paq_20", nombre: "20 créditos", creditos: 20, precio: 90 },
    { id: "paq_50", nombre: "50 créditos", creditos: 50, precio: 200 },
  ]);

  await prisma.configuracion.upsert({
    where: { clave: "creditos_paquetes" },
    update: { valor: paquetesCreditos },
    create: { clave: "creditos_paquetes", valor: paquetesCreditos },
  });

  await prisma.configuracion.upsert({
    where: { clave: "creditos_costo_por_solicitud" },
    update: { valor: "1" },
    create: { clave: "creditos_costo_por_solicitud", valor: "1" },
  });

  await prisma.configuracion.upsert({
    where: { clave: "plan_mensual_precio" },
    update: { valor: "20" },
    create: { clave: "plan_mensual_precio", valor: "20" },
  });

  await prisma.configuracion.upsert({
    where: { clave: "plan_mensual_comision_porcentaje" },
    update: { valor: "5" },
    create: { clave: "plan_mensual_comision_porcentaje", valor: "5" },
  });

  await prisma.configuracion.upsert({
    where: { clave: "plan_mensual_duracion_dias" },
    update: { valor: "30" },
    create: { clave: "plan_mensual_duracion_dias", valor: "30" },
  });

  console.log("Configuración lista: comision_porcentaje = 0, paquetes de créditos, costo por solicitud, plan mensual (precio, comisión %, duración)");
}

main()
  .catch((error) => {
    console.error("No se pudo crear el admin:", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
