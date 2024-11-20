import express from "express";
import dotenv from "dotenv";
import userRoutes from "./routes/user.js";
import companyPhonesRoutes from "./routes/companyPhones.js";
import quickAnswerRoutes from "./routes/quickAnswer.js";
import flowRoutes from "./routes/flow.js";
import messageRoutes from "./routes/message.js";
import tagRoutes from "./routes/tag.js";
import contactRoutes from "./routes/contact.js";
import conversationRoutes from "./routes/conversation.js";
import webhookRoutes from "./routes/index.js";
import templateRoutes from "./routes/template.js";
import catalogRoutes from "./routes/catalog.js";
import reportRoutes from "./routes/reports.js";
import campaignRoutes from "./routes/campaign.js";
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
import admin from "firebase-admin";
import serviceAccount from "./firebase-key.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

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

app.use("/phone", companyPhonesRoutes(pool));

app.use("/flow", flowRoutes(pool));

app.use("/message", messageRoutes(pool));

app.use("/conversation", conversationRoutes(pool));

app.use("/tag", tagRoutes(pool));

app.use("/contact", contactRoutes(pool));

app.use("/template", templateRoutes(pool));

app.use("/catalog", catalogRoutes(pool));

app.use("/report", reportRoutes(pool));

app.use("/quick-answer", quickAnswerRoutes(pool));

app.use("/campaign", campaignRoutes(pool));

app.get("/send-test-notification", (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send("Token is required");
  }

  const newmessage = {
    notification: {
      title: "new_message",
      body: JSON.stringify({
        table: "messages",
        action: "insert",
        data: {
          id: 731647,
          message_type: "button",
          conversation_id: 297542,
          message_id:
            "wamid.HBgLNTE5NDEyMjI5NzYVAgASGBQzQUI4MEVBODIxM0U1NzdCRjNCQQA=",
          status: "client",
          created_at: 1732064644,
          read: false,
          context_message_id:
            "wamid.HBgLNTE5NDEyMjI5NzYVAgARGBI5NTg4MjNBOTU3NzA0NzBEQzQA",
          message: {
            id: 731647,
            conversation_id: 297542,
            message_type: "button",
            status: "client",
            read: false,
            message: {
              id: 98133,
              text: "Quiero hacer un pedido",
              payload: "Quiero hacer un pedido",
              id_whatsapp:
                "wamid.HBgLNTE5NDEyMjI5NzYVAgASGBQzQUI4MEVBODIxM0U1NzdCRjNCQQA=",
              response_to:
                "wamid.HBgLNTE5NDEyMjI5NzYVAgARGBI5NTg4MjNBOTU3NzA0NzBEQzQA",
            },
            referral: {},
            created_at: "1732064644",
          },
          conversation: {
            id: 297542,
            company_phone_id: "1",
            last_message_time: "1732044772",
            last_message: null,
            message_type: "button",
            status: "client",
            message_created_at: "1732064644",
            contact_id: "46020",
            company_id: "1",
            unread_count: "2",
            user_assigned_id: 54,
            contact: {
              id: 46020,
              email: null,
              phone: "51941222976",
              country: null,
              name: "🥷🏼",
              tag_id: null,
            },
            tags: [
              {
                id: 4,
                name: "EF-En proceso",
                color: "#FFC300",
                description:
                  "Persona que está en conversación a punto de cancelar",
              },
              {
                id: 49,
                name: "EF-Masivo",
                color: "#002e6d",
                description: "15% de descuento",
              },
            ],
          },
        },
      }),
    },
    android: {
      priority: "high",
    },
    token: token,
  };

  admin
    .messaging()
    .send(newmessage)
    .then((response) => {
      console.log("Test Notification sent successfully:", response);
      res.status(200).send("Test Notification sent successfully");
    })
    .catch((error) => {
      console.log("Error sending Test Notification:", error);
      res.status(500).send("Error sending Test Notification");
    });
});

const server = app.listen(port, () => {
  console.log(`EF Whatsapp server running on port: ${port}`);
});

const queue = new BeeQueue("chat-bot", { removeOnSuccess: true });
queue.process(async (job) => {
  const task = job.data;
  try {
    await conversationModel.createMessage(
      task.conversation_id,
      JSON.parse(task.message),
      task.company_id
    );
    await job.remove();
    console.log(`Job processed: ${task.id}`);
    await queueModel.markJobAsProcessed(task.id);
  } catch (error) {
    console.log(error);
  }
});

const enqueueJobs = async () => {
  const jobsToProcess = await queueModel.getJobsToProcess();

  for (const job of jobsToProcess) {
    const existingJob = await queue.getJob(job.md5);
    if (!existingJob) {
      await queue.createJob(job).setId(job.md5).save();
    } else {
      await queueModel.markJobAsProcessed(job.id);
      console.log(
        `The job with hash ${job.md5} already exists. It was not enqueued again.`
      );
    }
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

  // const message = {
  //   notification: {
  //     title: eventName,
  //     body: JSON.stringify(payload),
  //   },
  //   android: {
  //     priority: "high",
  //   },
  //   topic: "all",
  // };

  // admin
  //   .messaging()
  //   .send(message)
  //   .then((response) => {
  //     console.log("Push Notification Ok", response);
  //   })
  //   .catch((error) => {
  //     console.log("Error sending Push Notification:", error);
  //   });
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
      let payload = JSON.parse(msg.payload);

      if (null == payload.data.conversation_id) {
        return;
      }
      console.log(`Notificación recibida ${payload.data.conversation_id}`);

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
        } else if (payload.action === "delete") {
          emitEventToUserChannel(
            payload.data.company_id,
            "delete_conversation",
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

cron.schedule("* * * * *", async () => {
  try {
    tempModel.processScheduledTasks();
    return true;
  } catch (error) {
    console.error("Error running cron 2:", error);
  }
});
