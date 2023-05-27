import express, { Express } from "express";
import dotenv from "dotenv";
import userRoutes from "./routes/user";
import messageRoutes from "./routes/message";
import conversationRoutes from "./routes/conversation";
import routes from "./routes";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger";
import { createPool, Pool } from "./database";

dotenv.config();
const app: Express = express();
const port: number = parseInt(process.env.PORT || "3001");

// Crear el objeto pool utilizando la función createPool
const pool: Pool = createPool();

app.use(express.json());

// Agregar la documentación Swagger a la ruta /api-docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Ruta index
app.use(routes);

// Rutas de usuario
app.use("/user", userRoutes(pool));

// Rutas de mensajes
app.use("/message", messageRoutes(pool));

// Rutas de conversaciones
app.use("/conversation", conversationRoutes(pool));

app.listen(port, () => {
  console.log(`Servidor en funcionamiento en el puerto ${port}`);
});
