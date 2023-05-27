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

dotenv.config();
const app = express();
const port = parseInt(process.env.PORT || "3001");

// Crear el objeto pool utilizando la función createPool
const pool = createPool();

app.use(express.json());

// Configura la validación de CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-ef-perfumes"], // Permite solo estos encabezados personalizados
  })
);

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

app.listen(port, () => {
  console.log(`Servidor en funcionamiento en el puerto ${port}`);
});
