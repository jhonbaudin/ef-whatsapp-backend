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
   *         description: Returns the conversations
   *       401:
   *         description: Unauthorized access
   *       404:
   *         description: Conversations not found
   *       500:
   *         description: Failed to get the conversations
   */
  router.get("/", verifyToken, validateCustomHeader, async (req, res) => {
    let { offset, limit, search, unread } = req.query;
    const { user } = req.body;

    // Parse offset and limit to integers with default values
    offset = offset ? String(offset) : "0";
    limit = limit ? String(limit) : "10";

    try {
      const conversations =
        await conversationModel.getAllConversationsWithLastMessage(
          parseInt(limit),
          parseInt(offset),
          user.company_id,
          search,
          unread
        );
      if (conversations) {
        res.json(conversations);
      } else {
        res.status(404).json({ message: "Conversations not found." });
      }
    } catch (error) {
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
   *       201:
   *         description: Conversation created successfully
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error creating the Conversation
   */
  router.post("/", verifyToken, validateCustomHeader, async (req, res) => {
    const { messageData, user, to } = req.body;

    if (!messageData || !messageData.type || !to) {
      res.status(400).json({ message: "Required parameters are missing." });
      return;
    }

    try {
      const conversation = await conversationModel.createConversation(
        user.company_id,
        to,
        messageData
      );
      res.status(201).json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Error creating conversation." });
    }
  });

  /**
   * @swagger
   * /conversation/{id}:
   *   get:
   *     summary: Get conversation by ID
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
   *         description: Returns the conversation
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       404:
   *         description: Conversation not found
   *       500:
   *         description: Failed to get the Conversation
   */
  router.get("/:id", verifyToken, validateCustomHeader, async (req, res) => {
    const { id } = req.params;
    const { user } = req.body;

    if (!id) {
      res.status(400).json({ message: "Required parameters are missing." });
      return;
    }

    try {
      const conversation = await conversationModel.getConversationById(
        id,
        user.company_id
      );
      if (conversation && conversation.length > 0) {
        res.json(conversation);
      } else {
        res.status(404).json({
          message: "Conversation not found.",
        });
      }
    } catch (error) {
      res.status(500).json({ message: "Error getting conversation." });
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
   *               messageData:
   *                 type: string
   *     responses:
   *       201:
   *         description: Message created successfully
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Failed to create the Message
   */
  router.post(
    "/:id/messages",
    verifyToken,
    validateCustomHeader,
    async (req, res) => {
      let { id } = req.params;
      const { messageData, user } = req.body;

      if (!id || !messageData || !messageData.type) {
        res.status(400).json({ message: "Required parameters are missing." });
        return;
      }

      try {
        const message = await conversationModel.createMessage(
          id,
          messageData,
          user.company_id
        );
        res.status(201).json(message);
      } catch (error) {
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
   *         description: Returns the messages of the conversation
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       404:
   *         description: Conversation not found or no messages available
   *       500:
   *         description: Failed to get the messages
   */
  router.get(
    "/:id/messages",
    verifyToken,
    validateCustomHeader,
    async (req, res) => {
      const { id } = req.params;
      let { offset, limit } = req.query;
      const { user } = req.body;

      if (!id) {
        res.status(400).json({ message: "Required parameters are missing." });
        return;
      }

      offset = offset ? String(offset) : "0";
      limit = limit ? String(limit) : "10";

      try {
        const messages =
          await conversationModel.getMessagesByConversationWithPagination(
            id,
            parseInt(offset),
            parseInt(limit),
            user.company_id
          );
        if (messages && messages.messages.length > 0) {
          res.json(messages);
        } else {
          res.status(404).json({
            message: "Conversation not found or no messages available.",
          });
        }
      } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error getting messages." });
      }
    }
  );

  return router;
}
