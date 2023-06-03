import express from "express";
import { validateCustomHeader } from "../middlewares/customHeader.js";
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
   *   description: API Message
   */

  /**
   * @swagger
   * /message/downloadMedia:
   *   post:
   *     summary: Download media file WhatsApp API Cloud
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
   *     responses:
   *       200:
   *         description: Success. Returns the created conversation.
   *       500:
   *         description: Failed to create the conversation.
   */
  router.post("/downloadMedia", validateCustomHeader, async (req, res) => {
    let { url } = req.body;

    try {
      const response = await mediaController.downloadMedia(url);
      res.status(200).send(response);
    } catch (error) {
      console.log("Error:", error);
      res.status(500).send("Error en el servidor");
    }
  });

  /**
   * @swagger
   * /message/markAsRead:
   *   post:
   *     summary: Mark message(s) as read.
   *     tags: [Message]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               ids:
   *                 type: array
   *                 description: Array of IDs
   *                 items:
   *                   type: integer
   *                 example: [2,3,4]
   *     responses:
   *       200:
   *         description: Success. Returns the created conversation.
   *       500:
   *         description: Failed to create the conversation.
   */
  router.post("/markAsRead", validateCustomHeader, async (req, res) => {
    const { ids } = req.body;
    try {
      const message = await conversationModel.markAsReadMessage(ids.join());
      res.json(message);
    } catch (error) {
      console.log("Error:", error);
      res.status(500).send("Error en el servidor");
    }
  });

  return router;
}
