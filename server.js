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

import { ConversationModel } from "./models/ConversationModel.js";

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

app.use(express.json());

app.use(cors(corsParams));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(webhookRoutes(pool));

app.use("/user", userRoutes(pool));

app.use("/message", messageRoutes(pool));

app.use("/conversation", conversationRoutes(pool));

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
      if (payload.table === "messages" && payload.action === "insert") {
        const newMessage = await conversationModel.getMessagesById(
          payload.data.id
        );
        const newConversation = await conversationModel.getConversationById(
          payload.data.conversation_id
        );

        payload.data = {};
        payload.data.message = newMessage;
        payload.data.conversation = newConversation;
      } else if (
        payload.table === "conversations" &&
        payload.action === "insert"
      ) {
        const newConversation = await conversationModel.getConversationById(
          payload.data.id
        );
        payload.data = newConversation;
      } else if (payload.table === "messages" && payload.action === "update") {
        const newMessage = { ...payload.data };
        const newConversation = await conversationModel.getConversationById(
          payload.data.conversation_id
        );
        payload.data = {};
        payload.data.message = newMessage;
        payload.data.conversation = newConversation;
      }
      notifyChanges(payload);
    }
  });
};

// listenToDatabaseNotifications();
