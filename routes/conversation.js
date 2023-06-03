import { Router } from "express";
import { ConversationModel } from "../models/ConversationModel.js";
import { verifyToken } from "../middlewares/auth.js";
import { validateCustomHeader } from "../middlewares/customHeader.js";

const router = Router();

export default function conversationRoutes(pool) {
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
   *   get:
   *     summary: Get all conversations with last message
   *     tags: [Conversation]
   *     parameters:
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *         description: Number of conversations to skip (for pagination)
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *         description: Maximum number of conversations to return (for pagination)
   *     responses:
   *       200:
   *         description: Success. Returns the conversations.
   *       404:
   *         description: Conversations not found.
   *       500:
   *         description: Failed to get the conversations.
   */
  router.get("/", verifyToken, validateCustomHeader, async (req, res) => {
    let { offset, limit } = req.query;
    const { user } = req.body;

    // Parse offset and limit to integers with default values
    offset = offset ? String(offset) : "0";
    limit = limit ? String(limit) : "10";

    try {
      const conversations =
        await conversationModel.getAllConversationsWithLastMessage(
          parseInt(limit),
          parseInt(offset),
          parseInt(user.company_id)
        );
      if (conversations) {
        res.json(conversations);
      } else {
        res.status(404).json({ message: "Conversations not found." });
      }
    } catch (error) {
      console.error("Error getting conversations:", error);
      res.status(500).json({ message: "Error getting conversations." });
    }
  });

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
   *               to:
   *                 type: string
   *     responses:
   *       200:
   *         description: Success. Returns the created conversation.
   *       500:
   *         description: Failed to create the conversation.
   */
  router.post("/", verifyToken, validateCustomHeader, async (req, res) => {
    const { to, user } = req.body;

    try {
      const conversation = await conversationModel.createConversation(
        user.company_id,
        to
      );
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Error creating conversation." });
    }
  });

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
   *               to:
   *                 type: string
   *               messageData:
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
    async (req, res) => {
      let { id } = req.params;
      const { to, messageData } = req.body;

      try {
        const message = await conversationModel.createMessage(
          parseInt(id),
          to,
          messageData
        );
        res.json(message);
      } catch (error) {
        console.error("Error creating message:", error);
        res.status(500).json({ message: "Error creating message." });
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
    async (req, res) => {
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
          res.status(404).json({
            message: "Conversation not found or no messages available.",
          });
        }
      } catch (error) {
        console.error("Error getting messages:", error);
        res.status(500).json({ message: "Error getting messages." });
      }
    }
  );

  return router;
}
