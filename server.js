import express from "express";
import dotenv from "dotenv";
import userRoutes from "./routes/user.js";
import flowRoutes from "./routes/flow.js";
import messageRoutes from "./routes/message.js";
import tagRoutes from "./routes/tag.js";
import contactRoutes from "./routes/contact.js";
import conversationRoutes from "./routes/conversation.js";
import webhookRoutes from "./routes/index.js";
import templateRoutes from "./routes/template.js";
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

dotenv.config();
const app = express();
const port = parseInt(process.env.PORT || "3001");
const queue = new BeeQueue("chat-bot");
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

queue.process(async (job) => {
  const task = job.data;
  console.log(`Processing job: ${task.id}`);
  await conversationModel.createMessage(
    task.conversation_id,
    JSON.parse(task.message),
    task.company_id
  );
  console.log(`Job processed: ${task.id}`);
  await queueModel.markJobAsProcessed(task.id);
});

const enqueueJobs = async () => {
  const jobsToProcess = await queueModel.getJobsToProcess();
  jobsToProcess.forEach(async (job) => {
    const existingJob = await queue.getJob(job.md5);
    if (!existingJob) {
      await queue.createJob(job).setId(job.md5).save();
    } else {
      await queueModel.markJobAsProcessed(job.id);
      console.log(
        `The job with hash ${job.md5} already exists. It was not enqueued again.`
      );
    }
  });
};

app.use(express.json({ limit: "100mb" }));

app.use(cors(corsParams));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(webhookRoutes(pool2));

app.use("/user", userRoutes(pool));

app.use("/flow", flowRoutes(pool));

app.use("/message", messageRoutes(pool));

app.use("/conversation", conversationRoutes(pool));

app.use("/tag", tagRoutes(pool));

app.use("/contact", contactRoutes(pool));

app.use("/template", templateRoutes(pool));

const server = app.listen(port, () => {
  console.log(`Servidor EF en funcionamiento en el puerto ${port}`);
});

const io = new Server(server, {
  cors: corsParams,
});

const newMessageForBot = (payload) => {
  if (payload.table === "messages" && payload.action === "insert") {
    flowModel.getNextMessage(
      payload.data.conversation.company_id,
      payload.data.message.id,
      payload.data.conversation.id
    );
  }
};

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
        try {
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
            if (newMessage.status == "client") {
              newMessageForBot(payload);
            }
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
        } catch (error) {
          console.log(error);
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
