const chatService = require("./chat.service");
const { obtenerIO, salaServicio } = require("../../config/socket");

async function listar(req, res) {
  const resultado = await chatService.listarMensajes(
    req.usuario,
    req.validated.params.id,
    req.validated.query,
  );
  res.status(200).json({ data: resultado });
}

async function enviar(req, res) {
  const mensaje = await chatService.enviarMensaje(
    req.usuario,
    req.validated.params.id,
    req.validated.body.contenido,
  );

  const io = obtenerIO();
  if (io) {
    io.to(salaServicio(mensaje.servicioId)).emit("mensaje:nuevo", { mensaje });
  }

  res.status(201).json({ data: { mensaje } });
}

module.exports = { listar, enviar };
