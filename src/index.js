require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./modules/auth/auth.routes");
const { notFound, errorHandler } = require("./middlewares/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ data: { servicio: "Trabajo Ya API", estado: "funcionando" } });
});

app.use("/auth", authRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});