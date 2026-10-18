require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const bcrypt = require("bcrypt");
const prisma = require("../src/config/prisma");
const {
  subirPrivado,
  CARPETA_VERIFICACION,
} = require("../src/config/cloudinary");

const SALT_ROUNDS = 10;
const PASSWORD = "123456";
const ADMIN_EMAIL = "admin@trabajoya.com";
const ADMIN_PASSWORD = "341600";
const IMAGEN = process.env.DNI_IMAGE || path.join(__dirname, "dni-prueba.jpg");

const DISPONIBILIDAD = [
  { dia: "lunes", desde: "08:00", hasta: "18:00" },
  { dia: "martes", desde: "08:00", hasta: "18:00" },
  { dia: "miercoles", desde: "08:00", hasta: "18:00" },
  { dia: "jueves", desde: "08:00", hasta: "18:00" },
  { dia: "viernes", desde: "08:00", hasta: "18:00" },
  { dia: "sabado", desde: "09:00", hasta: "14:00" },
];

const TECNICOS = [
  { nombre: "Jair Iglesias", email: "jair.iglesias@trabajoya.com", oficio: "electricidad", distritos: ["trujillo"], anios: 9, especialidades: ["Instalaciones eléctricas", "Tableros"], verificado: true },
  { nombre: "Edwin Iglesias", email: "edwin.iglesias@trabajoya.com", oficio: "electricidad", distritos: ["trujillo"], anios: 6, especialidades: ["Cableado", "Cortocircuitos"] },
  { nombre: "Ramon", email: "ramon@trabajoya.com", oficio: "electricidad", distritos: ["trujillo"], anios: 4, especialidades: ["Instalaciones eléctricas"] },
  { nombre: "Luis Mendoza", email: "luis.mendoza@trabajoya.com", oficio: "electricidad", distritos: ["trujillo"], anios: 12, especialidades: ["Tableros", "Pozos a tierra"] },
  { nombre: "Santiago Jara", email: "santiago.jara@trabajoya.com", oficio: "pintura", distritos: ["trujillo"], anios: 8, especialidades: ["Pintura de interiores", "Empastado"] },
  { nombre: "Marco Jimenez", email: "marco.jimenez@trabajoya.com", oficio: "pintura", distritos: ["trujillo"], anios: 5, especialidades: ["Pintura exterior"] },
  { nombre: "Erick", email: "erick@trabajoya.com", oficio: "pintura", distritos: ["trujillo"], anios: 3, especialidades: ["Pintura de interiores"] },
  { nombre: "Abel Tumbajulca", email: "abel.tumbajulca@trabajoya.com", oficio: "pintura", distritos: ["trujillo"], anios: 10, especialidades: ["Empastado", "Pintura decorativa"] },
  { nombre: "Javier", email: "javier.pintura@trabajoya.com", oficio: "pintura", distritos: ["trujillo"], anios: 7, especialidades: ["Pintura exterior"] },
  { nombre: "Omar", email: "omar@trabajoya.com", oficio: "carpinteria", distritos: ["trujillo"], anios: 11, especialidades: ["Muebles a medida", "Puertas"] },
  { nombre: "Jara", email: "jara@trabajoya.com", oficio: "carpinteria", distritos: ["trujillo"], anios: 6, especialidades: ["Closets", "Cocinas"] },
  { nombre: "Milton Giorgio", email: "milton.giorgio@trabajoya.com", oficio: "carpinteria", distritos: ["trujillo"], anios: 9, especialidades: ["Muebles a medida"] },
  { nombre: "Jose Murga", email: "jose.murga@trabajoya.com", oficio: "albanileria", distritos: ["trujillo"], anios: 13, especialidades: ["Tarrajado", "Pisos"] },
  { nombre: "José Parimango", email: "jose.parimango@trabajoya.com", oficio: "gasfiteria", distritos: ["trujillo"], anios: 8, especialidades: ["Instalación de tuberías", "Fugas"] },
  { nombre: "Javier", email: "javier.albanileria@trabajoya.com", oficio: "albanileria", distritos: ["trujillo"], anios: 5, especialidades: ["Tarrajado"] },
  { nombre: "Segundo Ramos", email: "segundo.ramos@trabajoya.com", oficio: "gasfiteria", distritos: ["trujillo"], anios: 15, especialidades: ["Gasfitería general", "Termas"] },
];

const CLIENTES = [
  { nombre: "Arom Sanchez", email: "arom.sanchez@trabajoya.com" },
  { nombre: "Carlos Caceres", email: "carlos.caceres@trabajoya.com" },
  { nombre: "Alan Roncal", email: "alan.roncal@trabajoya.com" },
  { nombre: "Mauricio Amando", email: "mauricio.amando@trabajoya.com" },
];

function diasAtras(dias) {
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
}

async function asegurarAdmin() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
  return prisma.usuario.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash, nombre: "Administrador", rol: "admin" },
    create: { email: ADMIN_EMAIL, passwordHash, nombre: "Administrador", rol: "admin" },
  });
}

async function crearUsuarios() {
  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  const tecnicos = [];
  for (const datos of TECNICOS) {
    const usuario = await prisma.usuario.upsert({
      where: { email: datos.email },
      update: { nombre: datos.nombre, rol: "tecnico" },
      create: {
        email: datos.email,
        passwordHash,
        nombre: datos.nombre,
        rol: "tecnico",
      },
    });
    tecnicos.push({ ...datos, usuarioId: usuario.id });
  }

  const clientes = [];
  for (const datos of CLIENTES) {
    const usuario = await prisma.usuario.upsert({
      where: { email: datos.email },
      update: { nombre: datos.nombre, rol: "cliente" },
      create: {
        email: datos.email,
        passwordHash,
        nombre: datos.nombre,
        rol: "cliente",
      },
    });
    clientes.push({ ...datos, usuarioId: usuario.id });
  }

  return { tecnicos, clientes };
}

async function prepararTecnicos(datosTecnicos) {
  const perfiles = new Map();
  for (const datos of datosTecnicos) {
    const tecnico = await prisma.tecnico.upsert({
      where: { usuarioId: datos.usuarioId },
      update: {
        oficio: datos.oficio,
        descripcion: `${datos.nombre.split(" ")[0]} — especialista en ${datos.oficio}`,
        aniosExperiencia: datos.anios,
        distritos: datos.distritos,
        disponibilidad: DISPONIBILIDAD,
        especialidades: datos.especialidades,
        disponible: true,
        estadoVerificacion: datos.verificado ? "verificado" : "en_revision",
        documentosEnviadosAt: diasAtras(2),
      },
      create: {
        usuarioId: datos.usuarioId,
        oficio: datos.oficio,
        descripcion: `${datos.nombre.split(" ")[0]} — especialista en ${datos.oficio}`,
        aniosExperiencia: datos.anios,
        distritos: datos.distritos,
        disponibilidad: DISPONIBILIDAD,
        especialidades: datos.especialidades,
        disponible: true,
        estadoVerificacion: datos.verificado ? "verificado" : "en_revision",
        documentosEnviadosAt: diasAtras(2),
      },
    });
    perfiles.set(datos.email, tecnico);
  }
  return perfiles;
}

async function limpiarDatosPrevios(tecnicos, clientes) {
  const tecnicoIds = [...tecnicos.values()].map((t) => t.id);

  await prisma.servicio.deleteMany({
    where: { clienteId: { in: clientes.map((c) => c.usuarioId) } },
  });
  await prisma.documentoVerificacion.deleteMany({
    where: { tecnicoId: { in: tecnicoIds } },
  });
  await prisma.historialVerificacion.deleteMany({
    where: { tecnicoId: { in: tecnicoIds } },
  });
}

async function subirDocumentos(perfiles, datosTecnicos, adminId) {
  if (!fs.existsSync(IMAGEN)) {
    throw new Error(`No se encontró la imagen de prueba: ${IMAGEN}`);
  }

  const buffer = fs.readFileSync(IMAGEN);
  const subida = await subirPrivado(buffer, `${CARPETA_VERIFICACION}/demo`);
  const base = {
    publicId: subida.public_id,
    resourceType: subida.resource_type,
    formato: subida.format,
    nombreOriginal: "dni-prueba.jpg",
    bytes: subida.bytes,
  };

  const TIPOS = ["dni_frente", "dni_reverso", "selfie"];
  let total = 0;

  for (const datos of datosTecnicos) {
    const tecnico = perfiles.get(datos.email);
    const estadoDoc = datos.verificado ? "aprobado" : "pendiente";
    for (const tipo of TIPOS) {
      await prisma.documentoVerificacion.create({
        data: { tecnicoId: tecnico.id, tipo, estado: estadoDoc, ...base },
      });
      total += 1;
    }
    if (datos.verificado) {
      await prisma.historialVerificacion.create({
        data: {
          tecnicoId: tecnico.id,
          adminId,
          estadoAnterior: "en_revision",
          estadoNuevo: "verificado",
          comentario: "Documentos correctos, identidad verificada.",
        },
      });
    }
  }

  return { total, base };
}

async function crearServicio(datos) {
  return prisma.servicio.create({
    data: {
      comisionPorcentaje: 0,
      ...datos,
    },
  });
}

async function crearServicios(ctx) {
  const { perfiles, clientes } = ctx;
  const porEmail = (e) => perfiles.get(e);
  const cli = (i) => clientes[i].usuarioId;

  const jair = porEmail("jair.iglesias@trabajoya.com");
  const santiago = porEmail("santiago.jara@trabajoya.com");
  const omar = porEmail("omar@trabajoya.com");
  const edwin = porEmail("edwin.iglesias@trabajoya.com");
  const milton = porEmail("milton.giorgio@trabajoya.com");
  const jara = porEmail("jara@trabajoya.com");
  const murga = porEmail("jose.murga@trabajoya.com");
  const segundo = porEmail("segundo.ramos@trabajoya.com");

  const base = (clienteId, tecnico, distrito, descripcion, completadoDias) => ({
    clienteId,
    tecnicoId: tecnico.id,
    distrito,
    direccion: "Av. Los Pinos 123",
    descripcion,
    fechaHora: diasAtras(completadoDias + 2),
    estado: "completado",
    aceptadoAt: diasAtras(completadoDias + 2),
    completadoAt: diasAtras(completadoDias),
    completadoPorId: tecnico.usuarioId,
    completadoPorRol: "tecnico",
    montoAcordado: 180,
    alcanceAcordado: descripcion,
  });

  const S = {};

  S.s1 = await crearServicio(base(cli(0), jair, "trujillo", "Cambio de tablero eléctrico", 20));
  S.s2 = await crearServicio(base(cli(1), jair, "el_porvenir", "Instalación de tomacorrientes", 15));
  S.s3 = await crearServicio(base(cli(2), jair, "moche", "Reparación de cortocircuito", 10));
  S.s4 = await crearServicio(base(cli(3), jair, "la_esperanza", "Punto de luz en cocina", 7));
  S.s5 = await crearServicio(base(cli(0), jair, "trujillo", "Mantenimiento eléctrico", 4));
  S.s6 = await crearServicio(base(cli(1), jair, "huanchaco", "Instalación de lámparas", 2));

  S.s7 = await crearServicio(base(cli(3), santiago, "salaverry", "Pintado de fachada", 9));
  S.s8 = await crearServicio(base(cli(0), omar, "victor_larco_herrera", "Puerta de madera a medida", 6));
  S.s9 = await crearServicio(base(cli(1), santiago, "trujillo", "Pintura de dormitorio", 12));
  S.s12 = await crearServicio(base(cli(0), jara, "trujillo", "Closet empotrado", 5));

  S.s10 = await crearServicio({
    clienteId: cli(2),
    tecnicoId: edwin.id,
    distrito: "trujillo",
    direccion: "Jr. Amazonas 456",
    descripcion: "Revisión de instalación eléctrica",
    fechaHora: diasAtras(1),
    estado: "aceptado",
    aceptadoAt: diasAtras(1),
    montoAcordado: 120,
  });

  S.s13 = await crearServicio({
    clienteId: cli(0),
    tecnicoId: murga.id,
    distrito: "el_porvenir",
    direccion: "Calle Las Palmeras 789",
    descripcion: "Tarrajado de pared",
    fechaHora: diasAtras(1),
    estado: "aceptado",
    aceptadoAt: diasAtras(1),
    montoAcordado: 250,
  });

  S.s11 = await crearServicio({
    clienteId: cli(1),
    tecnicoId: milton.id,
    distrito: "la_esperanza",
    direccion: "Av. Perú 321",
    descripcion: "Mueble de cocina",
    fechaHora: diasAtras(18),
    estado: "cancelado",
    canceladoPorId: cli(1),
    canceladoPorRol: "cliente",
    motivoCancelacion: "El cliente ya no necesitaba el servicio",
    cancelacionTardia: false,
    canceladoAt: diasAtras(17),
  });

  const tardio = async (clienteId, tecnico, distrito, dias, canceladoPorId, rol, motivo) =>
    crearServicio({
      clienteId,
      tecnicoId: tecnico.id,
      distrito,
      direccion: "Av. Los Pinos 123",
      descripcion: `Servicio de ${tecnico.oficio} cancelado tarde`,
      fechaHora: diasAtras(dias + 3),
      estado: "cancelado",
      aceptadoAt: diasAtras(dias + 3),
      canceladoPorId,
      canceladoPorRol: rol,
      motivoCancelacion: motivo,
      cancelacionTardia: true,
      canceladoAt: diasAtras(dias),
    });

  S.t1 = await tardio(cli(0), edwin, "trujillo", 12, cli(0), "cliente", "Canceló a última hora");
  S.t2 = await tardio(cli(0), santiago, "salaverry", 9, cli(0), "cliente", "Canceló a última hora");
  S.t3 = await tardio(cli(0), omar, "trujillo", 6, cli(0), "cliente", "Canceló a última hora");
  S.t4 = await tardio(cli(1), jara, "trujillo", 11, cli(1), "cliente", "Ya no podía atender");
  S.t5 = await tardio(cli(1), murga, "el_porvenir", 5, cli(1), "cliente", "Ya no podía atender");
  S.t6 = await tardio(cli(3), segundo, "la_esperanza", 8, cli(3), "cliente", "Canceló a última hora");
  S.t7 = await tardio(cli(2), jair, "trujillo", 7, jair.usuarioId, "tecnico", "Surgió otro trabajo");
  S.t8 = await tardio(cli(0), jair, "trujillo", 4, jair.usuarioId, "tecnico", "Surgió otro trabajo");

  return S;
}

async function crearResenas(ctx, S) {
  const { perfiles, clientes } = ctx;
  const jair = perfiles.get("jair.iglesias@trabajoya.com");
  const santiago = perfiles.get("santiago.jara@trabajoya.com");
  const omar = perfiles.get("omar@trabajoya.com");

  const datos = [
    { servicioId: S.s1.id, clienteId: clientes[0].usuarioId, tecnicoId: jair.id, calificacion: 5, comentario: "Puntual y muy profesional." },
    { servicioId: S.s2.id, clienteId: clientes[1].usuarioId, tecnicoId: jair.id, calificacion: 4, comentario: "Buen trabajo, precio justo." },
    { servicioId: S.s3.id, clienteId: clientes[2].usuarioId, tecnicoId: jair.id, calificacion: 5, comentario: "Excelente, lo recomiendo." },
    { servicioId: S.s4.id, clienteId: clientes[3].usuarioId, tecnicoId: jair.id, calificacion: 3, comentario: "Tardó un poco pero resolvió." },
    { servicioId: S.s5.id, clienteId: clientes[0].usuarioId, tecnicoId: jair.id, calificacion: 4, comentario: "Muy atento." },
    { servicioId: S.s6.id, clienteId: clientes[1].usuarioId, tecnicoId: jair.id, calificacion: 5, comentario: "Impecable." },
    { servicioId: S.s7.id, clienteId: clientes[3].usuarioId, tecnicoId: santiago.id, calificacion: 4, comentario: "Buena pintura." },
    { servicioId: S.s8.id, clienteId: clientes[0].usuarioId, tecnicoId: omar.id, calificacion: 2, comentario: "Dejó detalles sin terminar." },
  ];

  const creadas = [];
  for (const fila of datos) {
    creadas.push(await prisma.resena.create({ data: fila }));
  }
  return { creadas, resenaOmar: creadas[7] };
}

async function crearReportes(ctx, S, resenaOmar, adminId) {
  const { perfiles, clientes } = ctx;
  const jair = perfiles.get("jair.iglesias@trabajoya.com");
  const santiago = perfiles.get("santiago.jara@trabajoya.com");
  const omar = perfiles.get("omar@trabajoya.com");
  const edwin = perfiles.get("edwin.iglesias@trabajoya.com");
  const milton = perfiles.get("milton.giorgio@trabajoya.com");
  const jara = perfiles.get("jara@trabajoya.com");
  const segundo = perfiles.get("segundo.ramos@trabajoya.com");

  const filas = [
    { servicioId: S.s1.id, reportanteId: clientes[0].usuarioId, reportanteRol: "cliente", tipoObjetivo: "tecnico", objetivoUsuarioId: jair.usuarioId, categoria: "no_se_presento", comentario: "No llegó a la hora acordada.", estado: "pendiente" },
    { servicioId: S.s2.id, reportanteId: clientes[1].usuarioId, reportanteRol: "cliente", tipoObjetivo: "tecnico", objetivoUsuarioId: jair.usuarioId, categoria: "cobro_diferente", comentario: "Cobró más de lo acordado.", estado: "pendiente" },
    { servicioId: S.s3.id, reportanteId: clientes[2].usuarioId, reportanteRol: "cliente", tipoObjetivo: "tecnico", objetivoUsuarioId: jair.usuarioId, categoria: "trabajo_deficiente", comentario: "El trabajo quedó incompleto.", estado: "resuelto", resueltoPorId: adminId, notaResolucion: "Se contactó al técnico y se coordinó la corrección.", resueltoAt: diasAtras(3) },
    { servicioId: S.s4.id, reportanteId: clientes[3].usuarioId, reportanteRol: "cliente", tipoObjetivo: "tecnico", objetivoUsuarioId: jair.usuarioId, categoria: "comportamiento_inapropiado", comentario: "Trato poco amable.", estado: "descartado", resueltoPorId: adminId, notaResolucion: "Sin evidencia suficiente.", resueltoAt: diasAtras(2) },
    { servicioId: S.s8.id, reportanteId: clientes[0].usuarioId, reportanteRol: "cliente", tipoObjetivo: "tecnico", objetivoUsuarioId: omar.usuarioId, categoria: "trabajo_deficiente", comentario: "La puerta quedó desalineada.", estado: "pendiente" },
    { servicioId: S.s9.id, reportanteId: clientes[1].usuarioId, reportanteRol: "cliente", tipoObjetivo: "tecnico", objetivoUsuarioId: santiago.usuarioId, categoria: "cobro_diferente", comentario: "El precio final fue mayor.", estado: "pendiente" },
    { servicioId: S.s5.id, reportanteId: jair.usuarioId, reportanteRol: "tecnico", tipoObjetivo: "cliente", objetivoUsuarioId: clientes[0].usuarioId, categoria: "no_estaba", comentario: "El cliente no se encontraba en el domicilio.", estado: "pendiente" },
    { servicioId: S.s6.id, reportanteId: jair.usuarioId, reportanteRol: "tecnico", tipoObjetivo: "cliente", objetivoUsuarioId: clientes[1].usuarioId, categoria: "fraude", comentario: "Proporcionó datos falsos del domicilio.", estado: "resuelto", resueltoPorId: adminId, notaResolucion: "Se verificó y se amonestó al cliente.", resueltoAt: diasAtras(4) },
    { servicioId: S.s7.id, reportanteId: santiago.usuarioId, reportanteRol: "tecnico", tipoObjetivo: "cliente", objetivoUsuarioId: clientes[3].usuarioId, categoria: "comportamiento_inapropiado", comentario: "Reiterados malos tratos.", estado: "descartado", resueltoPorId: adminId, notaResolucion: "Sin pruebas concluyentes.", resueltoAt: diasAtras(1) },
    { servicioId: resenaOmar.servicioId, reportanteId: omar.usuarioId, reportanteRol: "tecnico", tipoObjetivo: "resena", objetivoResenaId: resenaOmar.id, categoria: "contenido_inapropiado", comentario: "La reseña contiene afirmaciones falsas.", estado: "pendiente" },
    { servicioId: S.s10.id, reportanteId: clientes[2].usuarioId, reportanteRol: "cliente", tipoObjetivo: "tecnico", objetivoUsuarioId: edwin.usuarioId, categoria: "no_se_presento", comentario: "No llegó a la cita.", estado: "pendiente" },
    { servicioId: S.t6.id, reportanteId: clientes[3].usuarioId, reportanteRol: "cliente", tipoObjetivo: "tecnico", objetivoUsuarioId: segundo.usuarioId, categoria: "trabajo_deficiente", comentario: "Trabajo mal ejecutado.", estado: "pendiente" },
    { servicioId: S.s12.id, reportanteId: clientes[0].usuarioId, reportanteRol: "cliente", tipoObjetivo: "tecnico", objetivoUsuarioId: jara.usuarioId, categoria: "fraude", comentario: "Cobros no declarados.", estado: "pendiente" },
    { servicioId: S.s11.id, reportanteId: clientes[1].usuarioId, reportanteRol: "cliente", tipoObjetivo: "tecnico", objetivoUsuarioId: milton.usuarioId, categoria: "comportamiento_inapropiado", comentario: "Respuesta agresiva por chat.", estado: "pendiente" },
  ];

  for (const fila of filas) {
    await prisma.reporte.create({ data: fila });
  }
  return filas.length;
}

async function recalcularReputacion() {
  const tecnicos = await prisma.tecnico.findMany({ select: { id: true } });
  for (const tecnico of tecnicos) {
    const agregado = await prisma.resena.aggregate({
      where: { tecnicoId: tecnico.id, oculta: false },
      _avg: { calificacion: true },
      _count: { _all: true },
    });
    const total = agregado._count._all;
    const completados = await prisma.servicio.count({
      where: { tecnicoId: tecnico.id, estado: "completado" },
    });
    await prisma.tecnico.update({
      where: { id: tecnico.id },
      data: {
        calificacionPromedio:
          total > 0 ? Math.round((agregado._avg.calificacion ?? 0) * 100) / 100 : null,
        totalResenas: total,
        serviciosCompletados: completados,
      },
    });
  }
}

async function main() {
  const admin = await asegurarAdmin();
  const { tecnicos, clientes } = await crearUsuarios();
  const perfiles = await prepararTecnicos(tecnicos);

  await limpiarDatosPrevios(perfiles, clientes);

  const { total: totalDocs, base } = await subirDocumentos(perfiles, tecnicos, admin.id);

  const ctx = { perfiles, clientes };
  const S = await crearServicios(ctx);
  const { resenaOmar } = await crearResenas(ctx, S);
  const totalReportes = await crearReportes(ctx, S, resenaOmar, admin.id);
  await recalcularReputacion();

  const totalServicios = Object.keys(S).length;

  console.log("Seed demo completado:");
  console.log(`  Admin: ${admin.email} (id ${admin.id})`);
  console.log(`  Técnicos: ${tecnicos.length} (1 verificado, ${tecnicos.length - 1} en revisión)`);
  console.log(`  Clientes: ${clientes.length}`);
  console.log(`  Documentos: ${totalDocs} (Cloudinary publicId ${base.publicId})`);
  console.log(`  Servicios: ${totalServicios}`);
  console.log(`  Reportes: ${totalReportes}`);
}

main()
  .catch((error) => {
    console.error("Error en el seed demo:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
