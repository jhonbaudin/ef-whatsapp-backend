import express from "express";
import { validateCustomHeader } from "../middlewares/customHeader.js";
import { TempModel } from "../models/TempModel.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

export default function webhookRoutes(pool) {
  const tempModel = new TempModel(pool);

  router.get("/", validateCustomHeader, (req, res) => {
    try {
      res.send(`EF WhatsApp API-${process.env.INSTANCE}!`);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * @swagger
   * tags:
   *   name: Webhook
   *   description: Endpoint for receiving data from WhatsApp Cloud API
   */

  /**
   * @swagger
   * /webhook:
   *   post:
   *     summary: Webhook endpoint to receive data from WhatsApp Cloud API
   *     tags: [Webhook]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               data:
   *                 type: string
   *                 description: JSON data received from WhatsApp Cloud API
   *             example:
   *               data: '{"message": "Hello, world!"}'
   *     responses:
   *       200:
   *         description: OK
   *       400:
   *         description: Bad Request - Invalid data provided
   *       500:
   *         description: Internal Server Error
   */
  router.post("/webhook", async (req, res) => {
    try {
      tempModel.createTemp(JSON.stringify(req.body));
      res.send("OK");
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  /**
   * @swagger
   * /webhook:
   *   get:
   *     summary: Validate webhook functionality
   *     tags: [Webhook]
   *     responses:
   *       200:
   *         description: Success
   *       500:
   *         description: Failed to validate
   */
  router.get("/webhook", (req, res) => {
    const verify_token = process.env.VALIDATION_TOKEN;
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    if (mode && token) {
      if (mode === "subscribe" && token === verify_token) {
        res.send(challenge);
      } else {
        res.status(403).send("Forbidden");
      }
    } else {
      res.status(401).send("Not Authorized");
    }
  });

  return router;
}
