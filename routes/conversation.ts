import express, { Request, Response, Router } from "express";
import { Pool } from "pg";
import {
  ConversationModel,
  Conversation,
  Message,
} from "../models/Conversation";
import { verifyToken } from "../middlewares/auth";
import { validateCustomHeader } from "../middlewares/customHeader";

const router: Router = express.Router();

export default function conversationRoutes(pool: Pool): Router {
  const conversationModel = new ConversationModel(pool);

  /**
   * @swagger
   * tags:
   *   name: Conversation
   *   description: API Conversation
   */

  /**
   * @swagger
   * /conversation:
   *   post:
   *     summary: Create a new conversation
   *     tags: [Conversation]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *     responses:
   *       200:
   *         description: Success. Returns the created conversation.
   *       500:
   *         description: Failed to create the conversation.
   */
  router.post(
    "/",
    verifyToken,
    validateCustomHeader,
    async (req: Request, res: Response): Promise<void> => {
      const { name } = req.body;

      try {
        const conversation = await conversationModel.createConversation(name);
        res.json(conversation);
      } catch (error) {
        console.error("Error al crear la conversación:", error);
        res.status(500).json({ message: "Error al crear la conversación." });
      }
    }
  );

  /**
   * @swagger
   * /conversation/{id}:
   *   get:
   *     summary: Get a conversation by ID
   *     tags: [Conversation]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Conversation ID
   *     responses:
   *       200:
   *         description: Success. Returns the found conversation.
   *       404:
   *         description: Conversation not found.
   *       500:
   *         description: Failed to get the conversation.
   */
  router.get(
    "/:id",
    verifyToken,
    validateCustomHeader,
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      try {
        const conversation = await conversationModel.getConversationById(
          parseInt(id)
        );
        if (conversation) {
          res.json(conversation);
        } else {
          res.status(404).json({ message: "Conversación no encontrada." });
        }
      } catch (error) {
        console.error("Error al obtener la conversación:", error);
        res.status(500).json({ message: "Error al obtener la conversación." });
      }
    }
  );

  /**
   * @swagger
   * /conversation/{id}/messages:
   *   post:
   *     summary: Create a new message in a conversation
   *     tags: [Conversation]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Conversation ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               sender:
   *                 type: string
   *               receiver:
   *                 type: string
   *               content:
   *                 type: string
   *     responses:
   *       200:
   *         description: Success. Returns the created message.
   *       404:
   *         description: Conversation not found.
   *       500:
   *         description: Failed to create the message.
   */
  router.post(
    "/:id/messages",
    verifyToken,
    validateCustomHeader,
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const { sender, receiver, content } = req.body;

      try {
        const message = await conversationModel.createMessage(
          parseInt(id),
          sender,
          receiver,
          content
        );
        res.json(message);
      } catch (error) {
        console.error("Error al crear el mensaje:", error);
        res.status(500).json({ message: "Error al crear el mensaje." });
      }
    }
  );

  /**
   * @swagger
   * /conversation/{id}/messages:
   *   get:
   *     summary: Get messages of a conversation by ID
   *     tags: [Conversation]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Conversation ID
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *         description: Number of messages to skip (for pagination)
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *         description: Maximum number of messages to return (for pagination)
   *     responses:
   *       200:
   *         description: Success. Returns the messages of the conversation.
   *       404:
   *         description: Conversation not found or no messages available.
   *       500:
   *         description: Failed to get the messages.
   */
  router.get(
    "/:id/messages",
    verifyToken,
    validateCustomHeader,
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      let { offset, limit } = req.query;

      // Parse offset and limit to integers with default values
      offset = offset ? String(offset) : "0";
      limit = limit ? String(limit) : "10";

      try {
        const messages =
          await conversationModel.getMessagesByConversationWithPagination(
            parseInt(id),
            parseInt(offset),
            parseInt(limit)
          );
        if (messages.length > 0) {
          res.json(messages);
        } else {
          res
            .status(404)
            .json({ message: "Conversación no encontrada o sin mensajes." });
        }
      } catch (error) {
        console.error("Error al obtener los mensajes:", error);
        res.status(500).json({ message: "Error al obtener los mensajes." });
      }
    }
  );

  return router;
}
