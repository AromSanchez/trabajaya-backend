const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const ApiError = require("./ApiError");
const chatService = require("../modules/chat/chat.service");

let io = null;

function salaServicio(servicioId) {
  return `servicio:${servicioId}`;
}

function obtenerIO() {
  return io;
}

function responderError(responder, socket, evento, error) {
  const mensaje = error instanceof ApiError ? error.message : "Error inesperado";
  if (!(error instanceof ApiError)) {
    console.error("Error en Socket.IO:", error);
  }
  const detalle = { error: mensaje };
  if (typeof responder === "function") {
    responder(detalle);
  }
  socket.emit(evento, detalle);
}

function inicializarSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) {
      return next(new Error("No autenticado"));
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.usuario = { id: payload.sub, rol: payload.rol };
      return next();
    } catch {
      return next(new Error("Token inválido o expirado"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("servicio:unirse", async (datos, responder) => {
      try {
        const servicioId = await chatService.validarParticipante(
          socket.usuario,
          datos && datos.servicio_id,
        );
        socket.join(salaServicio(servicioId));
        if (typeof responder === "function") {
          responder({ ok: true, servicio_id: servicioId });
        }
      } catch (error) {
        responderError(responder, socket, "servicio:error", error);
      }
    });

    socket.on("mensaje:enviar", async (datos, responder) => {
      try {
        const mensaje = await chatService.enviarMensaje(
          socket.usuario,
          datos && datos.servicio_id,
          datos && datos.contenido,
        );
        io.to(salaServicio(mensaje.servicioId)).emit("mensaje:nuevo", { mensaje });
        if (typeof responder === "function") {
          responder({ ok: true, mensaje });
        }
      } catch (error) {
        responderError(responder, socket, "mensaje:error", error);
      }
    });
  });

  return io;
}

module.exports = { inicializarSocket, obtenerIO, salaServicio };
