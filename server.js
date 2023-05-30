import express from "express";
import dotenv from "dotenv";
import userRoutes from "./routes/user.js";
import messageRoutes from "./routes/message.js";
import conversationRoutes from "./routes/conversation.js";
import webhookRoutes from "./routes/index.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger.js";
import { createPool } from "./database.js";
import cors from "cors";
import { Server } from "socket.io";

dotenv.config();
const app = express();
const port = parseInt(process.env.PORT || "3001");

// Crear el objeto pool utilizando la función createPool
const pool = createPool();
const corsParams = {
  origins: ["*"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-ef-perfumes"],
};

app.use(express.json());

// Configura la validación de CORS para Express
app.use(cors(corsParams));

// Agregar la documentación Swagger a la ruta /api-docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Ruta index
app.use(webhookRoutes(pool));

// Rutas de usuario
app.use("/user", userRoutes(pool));

// Rutas de mensajes
app.use("/message", messageRoutes(pool));

// Rutas de conversaciones
app.use("/conversation", conversationRoutes(pool));

// Iniciar el servidor HTTP
const server = app.listen(port, () => {
  console.log(`Servidor en funcionamiento en el puerto ${port}`);
});

// Iniciar el servidor de WebSocket
const io = new Server(server, {
  cors: corsParams,
});

// Función de notificación
const notifyChanges = (payload) => {
  io.emit("table_change_notification", payload);
};

// Escucha las notificaciones de la base de datos
const listenToDatabaseNotifications = async () => {
  const client = await pool.connect();

  client.query("LISTEN table_changes");

  client.on("notification", (msg) => {
    const payload = JSON.parse(msg.payload);
    console.log("Notificación recibida");

    // Filtra las notificaciones por tabla y acción
    if (
      (payload.table === "messages" && payload.action === "update") ||
      (payload.table === "messages" && payload.action === "insert") ||
      (payload.table === "conversations" && payload.action === "insert")
    ) {
      // Envía la notificación al frontend
      notifyChanges(payload);
    }
  });
};

// Escucha las notificaciones de la base de datos
listenToDatabaseNotifications();
