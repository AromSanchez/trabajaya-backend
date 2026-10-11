const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../../config/prisma");
const ApiError = require("../../config/ApiError");

const SALT_ROUNDS = 10;
const JWT_EXPIRA = "7d";

function firmarToken(usuario) {
  return jwt.sign({ sub: usuario.id, rol: usuario.rol }, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRA,
  });
}

function usuarioPublico(usuario) {
  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
  };
}

async function crearUsuario({ email, password, nombre, rol, conPerfilTecnico = false }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    return await prisma.usuario.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        nombre,
        rol,
        tecnico: conPerfilTecnico ? { create: { estadoVerificacion: "pendiente" } } : undefined,
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw new ApiError(409, "El correo ya está registrado");
    }
    throw error;
  }
}

async function registrarCliente({ email, password, nombre }) {
  const usuario = await crearUsuario({ email, password, nombre, rol: "cliente" });
  return { token: firmarToken(usuario), usuario: usuarioPublico(usuario) };
}

async function registrarTecnico({ email, password, nombre }) {
  const usuario = await crearUsuario({
    email,
    password,
    nombre,
    rol: "tecnico",
    conPerfilTecnico: true,
  });
  return { token: firmarToken(usuario), usuario: usuarioPublico(usuario) };
}

async function obtenerPerfil(id) {
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, email: true, nombre: true, rol: true },
  });

  if (!usuario) {
    throw new ApiError(404, "Usuario no encontrado");
  }

  return { usuario };
}

async function login({ email, password, rol }) {
  const usuario = await prisma.usuario.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!usuario || usuario.rol !== rol) {
    throw new ApiError(401, "Credenciales incorrectas");
  }

  const coincide = await bcrypt.compare(password, usuario.passwordHash);
  if (!coincide) {
    throw new ApiError(401, "Credenciales incorrectas");
  }

  return { token: firmarToken(usuario), usuario: usuarioPublico(usuario) };
}

module.exports = { registrarCliente, registrarTecnico, login, obtenerPerfil };