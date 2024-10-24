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
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Filter by number or name of contact
   *       - in: query
   *         name: unread
   *         schema:
   *           type: boolean
   *         description: Filter by unread messages
   *       - in: query
   *         name: overdue
   *         schema:
   *           type: boolean
   *         description: Filter by overdue messages
   *       - in: query
   *         name: tags
   *         schema:
   *           type: string
   *         description: Filter by tags, tag ids separated by comma
   *       - in: query
   *         name: initDate
   *         schema:
   *           type: date
   *         description: Filter by init date, yyyy-m-d
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: date
   *         description: Filter by end date, yyyy-m-d
   *       - in: query
   *         name: company_phone_id
   *         schema:
   *           type: integer
   *         description: Company phone id
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
    let {
      offset,
      limit,
      search,
      unread,
      company_phone_id,
      tags,
      initDate,
      endDate,
      overdue,
    } = req.query;
    const { user } = req.body;

    // Parse offset and limit to integers with default values
    offset = offset ? String(offset) : "0";

    try {
      const conversations =
        await conversationModel.getAllConversationsWithLastMessage(
          limit,
          parseInt(offset),
          user.company_id,
          company_phone_id,
          search,
          unread,
          tags,
          initDate,
          endDate,
          overdue,
          user.id,
          user.role
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
    const { messageData, user, to, company_phone_id } = req.body;

    if (!messageData || !messageData.type || !to) {
      res.status(400).json({ message: "Required parameters are missing." });
      return;
    }

    try {
      const conversation = await conversationModel.createConversation(
        user.company_id,
        to,
        company_phone_id,
        messageData,
        user.id
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
        user.company_id,
        user.id,
        user.role
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
   * /conversation/{id}:
   *   delete:
   *     summary: Delete conversation by ID
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
   *         description: Conversation deleted
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       404:
   *         description: Conversation not found
   *       500:
   *         description: Failed to delete the Conversation
   */
  router.delete("/:id", verifyToken, validateCustomHeader, async (req, res) => {
    const { id } = req.params;
    const { user } = req.body;

    if (!id) {
      res.status(400).json({ message: "Required parameters are missing." });
      return;
    }

    try {
      const conversation = await conversationModel.deleteConversationById(
        id,
        user.company_id
      );
      if (conversation == true) {
        res.status(200).json({
          message: "Conversation deleted.",
        });
      } else {
        res.status(404).json({
          message: "Conversation not found.",
        });
      }
    } catch (error) {
      res.status(500).json({ message: "Error deleting conversation." });
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

  /**
   * @swagger
   * /conversation/{id}/tag/{tag}:
   *   post:
   *     summary: Assign tag in conversation.
   *     tags: [Conversation]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Conversation ID
   *       - in: path
   *         name: tag
   *         schema:
   *           type: integer
   *         required: true
   *         description: Tag ID
   *     responses:
   *       201:
   *         description: Tag assigned successfully
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Failed on assign tag to conversation
   */
  router.post(
    "/:id/tag/:tag",
    verifyToken,
    validateCustomHeader,
    async (req, res) => {
      let { id, tag } = req.params;
      const { user } = req.body;

      if (!id || !tag) {
        res.status(400).json({ message: "Required parameters are missing." });
        return;
      }

      try {
        const tags = await conversationModel.assignTagToConversation(
          id,
          tag,
          user.company_id
        );
        res.status(201).json(tags);
      } catch (error) {
        res
          .status(500)
          .json({ message: "Error assigning tag to conversation." });
      }
    }
  );

  /**
   * @swagger
   * /conversation/{id}/tag/{tag}:
   *   delete:
   *     summary: Delete tag in conversation.
   *     tags: [Conversation]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Conversation ID
   *       - in: path
   *         name: tag
   *         schema:
   *           type: integer
   *         required: true
   *         description: Tag ID
   *     responses:
   *       201:
   *         description: Tag deleted successfully
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Failed to delete tag on conversation
   */
  router.delete(
    "/:id/tag/:tag",
    verifyToken,
    validateCustomHeader,
    async (req, res) => {
      let { id, tag } = req.params;

      if (!id || !tag) {
        res.status(400).json({ message: "Required parameters are missing." });
        return;
      }

      try {
        await conversationModel.removeTagToConversation(id, tag);
        res.status(200).json({ message: "Tag deleted successfully." });
      } catch (error) {
        res
          .status(500)
          .json({ message: "Error deleting tag on conversation." });
      }
    }
  );

  /**
   * @swagger
   * /conversation/tag/{tag}/massive/{company_phone_id}:
   *   put:
   *     summary: Assign tag to array of conversation IDs .
   *     tags: [Conversation]
   *     parameters:
   *       - in: path
   *         name: tag
   *         schema:
   *           type: integer
   *         required: true
   *         description: Tag ID to assing
   *       - in: path
   *         name: company_phone_id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Company Phone ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               conversations:
   *                 type: array
   *                 items:
   *                   type: integer
   *               phones:
   *                 type: array
   *                 items:
   *                   type: string
   *               dispatch_date:
   *                 type: string
   *       description: Object with the property 'conversations' and 'phones' containing an array of conversation IDs or phones numbers to which the tag will be assigned.
   *     responses:
   *       204:
   *         description: Tags assigned successfully
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Failed on assign tag to conversation
   */
  router.put(
    "/tag/:tag/massive/:company_phone_id",
    verifyToken,
    validateCustomHeader,
    async (req, res) => {
      let { tag, company_phone_id } = req.params;
      const { user, conversations, phones, dispatch_date } = req.body;

      if (!tag || (!conversations && !phones)) {
        return res
          .status(400)
          .json({ message: "Required parameters are missing." });
      }

      let finalDispatchDate;

      if (dispatch_date) {
        finalDispatchDate = new Date(dispatch_date);

        if (isNaN(finalDispatchDate.getTime())) {
          return res
            .status(400)
            .json({ message: "Invalid dispatch_date format." });
        }
        if (finalDispatchDate <= new Date()) {
          return res
            .status(400)
            .json({ message: "dispatch_date must be in the future." });
        }
      } else {
        finalDispatchDate = new Date();
      }

      try {
        conversationModel.saveScheduledTasks(
          tag,
          company_phone_id,
          user.id,
          conversations ? JSON.stringify(conversations) : null,
          phones ? JSON.stringify(phones) : null,
          finalDispatchDate
        );
        res.status(204).json();
      } catch (error) {
        console.error("Error scheduling task:", error);
        res.status(500).json({ message: "Internal server error." });
      }
    }
  );

  return router;
}
