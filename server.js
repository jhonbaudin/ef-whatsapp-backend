import express from "express";
import dotenv from "dotenv";
import userRoutes from "./routes/user.js";
import messageRoutes from "./routes/message.js";
import tagRoutes from "./routes/tag.js";
import contactRoutes from "./routes/contact.js";
import conversationRoutes from "./routes/conversation.js";
import webhookRoutes from "./routes/index.js";
import templateRoutes from "./routes/template.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger.js";
import cors from "cors";
import { createPool } from "./database.js";
import { Server } from "socket.io";
import { ConversationModel } from "./models/ConversationModel.js";
import cron from "node-cron";
import { TempModel } from "./models/TempModel.js";

dotenv.config();
const app = express();
const port = parseInt(process.env.PORT || "3001");

const pool = createPool();
const corsParams = {
  origins: ["*"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-ef-perfumes"],
};

const conversationModel = new ConversationModel(pool);
const tempModel = new TempModel(pool);

app.use(express.json({ limit: "100mb" }));

app.use(cors(corsParams));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(webhookRoutes(pool));

app.use("/user", userRoutes(pool));

app.use("/message", messageRoutes(pool));

app.use("/conversation", conversationRoutes(pool));

app.use("/tag", tagRoutes(pool));

app.use("/contact", contactRoutes(pool));

app.use("/template", templateRoutes(pool));

const server = app.listen(port, () => {
  console.log(`Servidor en funcionamiento en el puerto ${port}`);
});

const io = new Server(server, {
  cors: corsParams,
});

const notifyChanges = (payload) => {
  io.emit("table_change_notification", payload);
};

const listenToDatabaseNotifications = async () => {
  try {
    const client = await pool.connect();
    client.query("LISTEN table_changes");
    client.on("notification", async (msg) => {
      let payload = JSON.parse(msg.payload);
      console.log("Notificación recibida");
      if (
        (payload.table === "messages" && payload.action === "update") ||
        (payload.table === "messages" && payload.action === "insert") ||
        (payload.table === "conversations" && payload.action === "insert")
      ) {
        if (
          (payload.table === "messages" && payload.action === "insert") ||
          (payload.table === "messages" && payload.action === "update")
        ) {
          const newConversation =
            await conversationModel.getConversationByIdWithLastMessage(
              payload.data.conversation_id
            );

          const newMessage = await conversationModel.getMessagesById(
            payload.data.id
          );
          payload.data = {};
          payload.data.message = newMessage;
          payload.data.conversation = newConversation;
        } else if (
          payload.table === "conversations" &&
          payload.action === "insert"
        ) {
          const newConversation =
            await conversationModel.getConversationByIdWithLastMessage(
              payload.data.id
            );
          payload.data = newConversation;
        }
        notifyChanges(payload);
      }
    });

    client.on("end", () => {
      console.log("Conexión cerrada por el servidor");
      createPool();
    });

    client.on("error", (err) => {
      console.error("Error en la conexión:", err);
      createPool();
    });
  } catch (error) {
    console.error("Error de conexión con la base de datos:", error);
    createPool();
  }
};

listenToDatabaseNotifications();

cron.schedule("*/5 * * * * *", async () => {
  try {
    tempModel.cron();
    return true;
  } catch (error) {
    console.error("Error running cron:", error);
  }
});
