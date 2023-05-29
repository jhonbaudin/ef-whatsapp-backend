import express from "express";
import { validateCustomHeader } from "../middlewares/customHeader.js";
import { MediaController } from "../thirdParty/whatsappCloudAPI/mediaController.js";
const router = express.Router();
const mediaController = new MediaController();

export default function messageRoutes(pool) {
  /**
   * @swagger
   * tags:
   *   name: Message
   *   description: API Message
   */

  /**
   * @swagger
   * /message/donwloadMedia:
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
  router.post("/donwloadMedia", validateCustomHeader, async (req, res) => {
    let { url } = req.body;

    try {
      const response = await mediaController.downloadMedia(url);
      res.status(200).send(response);
    } catch (error) {
      console.log("Error:", error);
      res.status(500).send("Error en el servidor");
    }
  });

  return router;
}
