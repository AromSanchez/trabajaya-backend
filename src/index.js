require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createServer } = require("node:http");
const authRoutes = require("./modules/auth/auth.routes");
const tecnicosRoutes = require("./modules/tecnicos/tecnicos.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const metricasRoutes = require("./modules/metricas/metricas.routes");
const oficiosRoutes = require("./modules/oficios/oficios.routes");
const serviciosRoutes = require("./modules/servicios/servicios.routes");
const chatRoutes = require("./modules/chat/chat.routes");
const resenasRoutes = require("./modules/resenas/resenas.routes");
const reportesRoutes = require("./modules/reportes/reportes.routes");
const favoritosRoutes = require("./modules/favoritos/favoritos.routes");
const notificacionesRoutes = require("./modules/notificaciones/notificaciones.routes");
const { inicializarSocket } = require("./config/socket");
const { notFound, errorHandler } = require("./middlewares/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ data: { servicio: "Trabajo Ya API", estado: "funcionando" } });
});

app.use("/auth", authRoutes);
app.use("/tecnicos", tecnicosRoutes);
app.use("/admin/metricas", metricasRoutes);
app.use("/admin", adminRoutes);
app.use("/oficios", oficiosRoutes);
app.use("/servicios", serviciosRoutes);
app.use("/chat", chatRoutes);
app.use("/reportes", reportesRoutes.router);
app.use("/admin", reportesRoutes.admin);
app.use("/tecnicos", resenasRoutes.publicas);
app.use("/cliente", resenasRoutes.cliente);
app.use("/tecnico", resenasRoutes.tecnico);
app.use("/favoritos", favoritosRoutes);
app.use("/notificaciones", notificacionesRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const server = createServer(app);
inicializarSocket(server);

server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});