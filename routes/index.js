import express from "express";
import { validateCustomHeader } from "../middlewares/customHeader.js";
import { body, validationResult } from "express-validator";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// Ruta GET en la raíz para probar el API
router.get("/", validateCustomHeader, (req, res) => {
  try {
    res.send("¡Bienvenido al API EF Whatsapp!");
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
router.post(
  "/webhook",
  body("data").notEmpty().isString(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(404).json({ errors: errors.array() });
        return;
      }
      const { data } = req.body;
      console.log(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

/**
 * @swagger
 * /webhook:
 *   get:
 *     summary: Validate webhook functionality
 *     tags: [Webhook]
 *     responses:
 *       200:
 *         description: Success.
 *       500:
 *         description: Failed to validate.
 */
router.get("/webhook", (req, res) => {
  const verify_token = process.env.VALIDATION_TOKEN;
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === verify_token) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.status(403).send("Forbidden");
    }
  } else {
    res.status(401).send("Not Authorized");
  }
});

export default router;
