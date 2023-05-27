import express, { Request, Response, Router } from "express";
import { Pool } from "pg";
import { MessageModel } from "../models/Message";
import { ConversationModel } from "../models/Conversation";
import { verifyToken } from "../middlewares/auth";
import { validateCustomHeader } from "../middlewares/customHeader";

const router: Router = express.Router();

export default function messageRoutes(pool: Pool): Router {
  const messageModel = new MessageModel(pool);
  const conversationModel = new ConversationModel(pool);

  /**
   * @swagger
   * tags:
   *   name: Message
   *   description: API Message
   */

  /**
   * @swagger
   * /message/send:
   *   post:
   *     summary: Send a message
   *     tags: [Message]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               conversationId:
   *                 type: string
   *               sender:
   *                 type: string
   *               receiver:
   *                 type: string
   *               content:
   *                 type: string
   *     responses:
   *       200:
   *         description: Message sent successfully
   *       404:
   *         description: Conversation not found
   *       500:
   *         description: Failed to send message
   */
  router.post(
    "/send",
    verifyToken,
    validateCustomHeader,
    async (req: Request, res: Response): Promise<void> => {
      const { conversationId, sender, receiver, content } = req.body;

      try {
        // Verificar si la conversación existe antes de enviar el mensaje
        const conversation = await conversationModel.getConversationById(
          conversationId
        );
        if (!conversation) {
          res.status(404).json({ message: "Conversación no encontrada." });
          return;
        }

        const message = await messageModel.sendMessage(
          conversationId,
          sender,
          receiver,
          content
        );
        res.json(message);
      } catch (error) {
        console.error("Error al enviar el mensaje:", error);
        res.status(500).json({ message: "Error al enviar el mensaje." });
      }
    }
  );

  /**
   * @swagger
   * /message/receive:
   *   post:
   *     summary: Receive messages from a conversation
   *     tags: [Message]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               conversationId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Messages received successfully
   *       404:
   *         description: Conversation not found
   *       500:
   *         description: Failed to receive messages
   */
  router.post(
    "/receive",
    verifyToken,
    validateCustomHeader,
    async (req: Request, res: Response): Promise<void> => {
      const { conversationId } = req.body;

      try {
        // Verificar si la conversación existe antes de recibir los mensajes
        const conversation = await conversationModel.getConversationById(
          conversationId
        );
        if (!conversation) {
          res.status(404).json({ message: "Conversación no encontrada." });
          return;
        }

        const messages = await messageModel.getMessagesByConversation(
          conversationId
        );
        res.json(messages);
      } catch (error) {
        console.error("Error al recibir los mensajes:", error);
        res.status(500).json({ message: "Error al recibir los mensajes." });
      }
    }
  );

  return router;
}
