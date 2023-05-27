import express from "express";
import { validateCustomHeader } from "../middlewares/customHeader.js";
import { body, validationResult } from "express-validator";

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
      // Validar los errores de validación de express-validator
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { data } = req.body;
      console.log(data);

      // Realizar alguna acción con los datos recibidos
      // Aquí puedes procesar los mensajes entrantes, enviar respuestas, almacenarlos en una base de datos, etc.

      // Enviar una respuesta al servidor de WhatsApp Cloud
      res.status(200).send("OK");
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

export default router;
