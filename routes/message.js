import express from "express";
import { validateCustomHeader } from "../middlewares/customHeader.js";
import { verifyToken } from "../middlewares/auth.js";
import { MediaController } from "../thirdParty/whatsappCloudAPI/mediaController.js";
import { ConversationModel } from "../models/ConversationModel.js";
const router = express.Router();
const mediaController = new MediaController();

export default function messageRoutes(pool) {
  const conversationModel = new ConversationModel(pool);

  /**
   * @swagger
   * tags:
   *   name: Message
   *   description: Message API
   */

  /**
   * @swagger
   * /message/downloadMedia:
   *   post:
   *     summary: Download media file from WhatsApp API Cloud
   *     tags: [Message]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               url:
   *                 type: string
   *               conversation_id:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Returns the downloaded media
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Failed to download the media
   */
  router.post(
    "/downloadMedia",
    verifyToken,
    validateCustomHeader,
    async (req, res) => {
      let { user, url, conversation_id } = req.body;

      if (!url) {
        res.status(400).json({ message: "Required parameters are missing." });
        return;
      }
      try {
        const { wp_bearer_token } = await conversationModel.getConversationById(
          conversation_id,
          user.company_id
        );
        const response = await mediaController.downloadMedia(
          url,
          wp_bearer_token
        );
        res.send(response);
      } catch (error) {
        console.log(error);
        res.status(500).send("Server error");
      }
    }
  );

  /**
   * @swagger
   * /message/markAsRead:
   *   post:
   *     summary: Mark message(s) as read
   *     tags: [Message]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               conversation_id:
   *                 type: string
   *                 description: Conversation id
   *                 example: 2
   *     responses:
   *       200:
   *         description: Returns the marked messages
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Failed to mark as read
   */
  router.post(
    "/markAsRead",
    verifyToken,
    validateCustomHeader,
    async (req, res) => {
      const { conversation_id, user } = req.body;

      if (!conversation_id) {
        res.status(400).json({ message: "Required parameters are missing." });
        return;
      }

      try {
        const message = await conversationModel.markAsReadMessage(
          conversation_id,
          user.company_id
        );
        res.json(message);
      } catch (error) {
        res.status(500).send("Server error");
      }
    }
  );

  return router;
}
