import express from "express";
import dotenv from "dotenv";
import userRoutes from "./routes/user.js";
import companyPhones from "./routes/company_phones.js";
import flowRoutes from "./routes/flow.js";
import messageRoutes from "./routes/message.js";
import tagRoutes from "./routes/tag.js";
import contactRoutes from "./routes/contact.js";
import conversationRoutes from "./routes/conversation.js";
import webhookRoutes from "./routes/index.js";
import templateRoutes from "./routes/template.js";
import catalogRoutes from "./routes/catalog.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger.js";
import cors from "cors";
import { getPool } from "./database.js";
import { Server } from "socket.io";
import { ConversationModel } from "./models/ConversationModel.js";
import cron from "node-cron";
import { TempModel } from "./models/TempModel.js";
import { FlowModel } from "./models/FlowModel.js";
import { QueueModel } from "./models/QueueModel.js";
import BeeQueue from "bee-queue";
import jwt from "jsonwebtoken";

dotenv.config();
const app = express();
const port = parseInt(process.env.PORT || "3001");
const pool = getPool("pool1");
const pool2 = getPool("pool2");
const corsParams = {
  origins: ["*"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-ef-perfumes"],
};
const conversationModel = new ConversationModel(pool);
const tempModel = new TempModel(pool2);
const flowModel = new FlowModel(pool2);
const queueModel = new QueueModel(pool2);

app.use(express.json({ limit: "100mb" }));

app.use(cors(corsParams));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(webhookRoutes(pool2));

app.use("/user", userRoutes(pool));

app.use("/phone", companyPhones(pool));

app.use("/flow", flowRoutes(pool));

app.use("/message", messageRoutes(pool));

app.use("/conversation", conversationRoutes(pool));

app.use("/tag", tagRoutes(pool));

app.use("/contact", contactRoutes(pool));

app.use("/template", templateRoutes(pool));

app.use("/catalog", catalogRoutes(pool));

const server = app.listen(port, () => {
  console.log(`EF Whatsapp server running on port: ${port}`);
});

// const queue = new BeeQueue("chat-bot", { removeOnSuccess: true });
// queue.process(async (job) => {
//   const task = job.data;
//   try {
//     await conversationModel.createMessage(
//       task.conversation_id,
//       JSON.parse(task.message),
//       task.company_id
//     );
//     await job.remove();
//     console.log(`Job processed: ${task.id}`);
//     await queueModel.markJobAsProcessed(task.id);
//   } catch (error) {
//     console.log(error);
//   }
// });

const enqueueJobs = async () => {
  const jobsToProcess = await queueModel.getJobsToProcess();

  for (const job of jobsToProcess) {
    try {
      await conversationModel.createMessage(
        job.conversation_id,
        JSON.parse(job.message),
        job.company_id
      );
      console.log(`Job processed: ${job.id}`);
      await queueModel.markJobAsProcessed(job.id);
    } catch (error) {
      console.log(error);
    }
    // const existingJob = await queue.getJob(job.md5);
    // if (!existingJob) {
    //   await queue.createJob(job).setId(job.md5).save();
    // } else {
    //   await queueModel.markJobAsProcessed(job.id);
    //   console.log(
    //     `The job with hash ${job.md5} already exists. It was not enqueued again.`
    //   );
    // }
  }
};

const io = new Server(server, {
  cors: corsParams,
}).of("/socket");

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication token not provided."));
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error("Invalid token."));
    }
    socket.user = decoded;
    next();
  });
});

io.on("connection", (socket) => {
  if (!socket.user) {
    socket.disconnect(true);
    return;
  }
  socket.on("join_new_channel", () => {
    socket.join(`user_channel_${socket.user.company_id}`);
  });
});

const emitEventToUserChannel = (company_id, eventName, payload) => {
  io.emit(eventName, payload);
};

const newMessageForBot = (payload) => {
  if (payload.table === "messages" && payload.action === "insert") {
    flowModel.getNextMessage(
      payload.data.conversation.company_id,
      payload.data.message.id,
      payload.data.conversation.id,
      payload.data.conversation.company_phone_id
    );
  }
};

const listenToDatabaseNotifications = async () => {
  try {
    const client = await pool.connect();
    client.query("LISTEN table_changes");
    client.on("notification", async (msg) => {
      console.log("Notificación recibida");
      let payload = JSON.parse(msg.payload);

      const getConversation = async (conversationId) => {
        return conversationModel.getConversationByIdWithLastMessage(
          conversationId
        );
      };

      const getMessage = async (messageId) => {
        return conversationModel.getMessagesById(messageId);
      };

      if (payload.table === "messages") {
        if (payload.action === "update" || payload.action === "insert") {
          let newMessage = await getMessage(payload.data.id);
          let newConversation = await getConversation(
            payload.data.conversation_id
          );

          if (payload.action === "insert") {
            payload.data.message = newMessage;
            payload.data.conversation = newConversation;

            if (newMessage.status == "client") {
              newMessageForBot(payload);
            }

            emitEventToUserChannel(
              payload.data.conversation.company_id,
              "new_message",
              payload
            );
          } else if (payload.action === "update") {
            payload.data.message = newMessage;
            payload.data.conversation = newConversation;
            emitEventToUserChannel(
              payload.data.conversation.company_id,
              "update_message",
              payload
            );
          }

          emitEventToUserChannel(
            payload.data.conversation.company_id,
            "update_conversation",
            payload
          );
        }
      } else if (payload.table === "conversations") {
        if (payload.action === "insert") {
          const newConversation = await getConversation(payload.data.id);
          payload.data = newConversation;
          emitEventToUserChannel(
            payload.data.company_id,
            "new_conversation",
            payload
          );
        }
      } else if (payload.table === "conversations_tags") {
        if (payload.action === "insert" || payload.action === "delete") {
          const newConversation = await getConversation(
            payload.data.conversation_id
          );
          payload.data = newConversation;
          if (payload.action === "delete") {
            payload.data.tags.filter((tag) => tag.id !== payload.data.tag_id);
          }
          emitEventToUserChannel(
            payload.data.company_id,
            "conversation_tags",
            payload
          );
        }
      }
    });

    client.on("end", () => {
      console.log("Conexión cerrada por el servidor");
      getPool("pool1");
    });

    client.on("error", (err) => {
      console.error("Error en la conexión:", err);
      getPool("pool1");
    });
  } catch (error) {
    console.error("Error de conexión con la base de datos:", error);
    getPool("pool1");
  }
};

listenToDatabaseNotifications();

cron.schedule("*/8 * * * * *", async () => {
  try {
    tempModel.cron();
    enqueueJobs();
    return true;
  } catch (error) {
    console.error("Error running cron:", error);
  }
});
