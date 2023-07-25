import express from "express";
import { FlowModel } from "../models/FlowModel.js";
import { verifyToken } from "../middlewares/auth.js";
import { validateCustomHeader } from "../middlewares/customHeader.js";

const router = express.Router();

export default function flowRoutes(pool) {
  const flowModel = new FlowModel(pool);

  /**
   * @swagger
   * tags:
   *   name: Flow
   *   description: Flow API
   */

  /**
   * @swagger
   * /flow:
   *   get:
   *     summary: Get all flows
   *     tags: [Flow]
   *     responses:
   *       200:
   *         description: Returns a list of flows
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Failed to get flows
   */
  router.get("/", verifyToken, validateCustomHeader, async (req, res) => {
    const { user, company_phone_id } = req.body;

    try {
      const flows = await flowModel.getFlows(user.company_id, company_phone_id);
      res.json(flows);
    } catch (error) {
      res.status(500).json({ message: "Error getting the flows." });
    }
  });

  /**
   * @swagger
   * /flow:
   *   post:
   *     summary: Create or update flows
   *     tags: [Flow]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               flow:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     source:
   *                       type: string
   *                     sourceHandle:
   *                       type: string
   *                     target:
   *                       type: string
   *                     targetHandle:
   *                       type: string
   *                     id:
   *                       type: string
   *     responses:
   *       200:
   *         description: Flows created or updated successfully
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Failed to create or update flows
   */
  router.post("/", verifyToken, validateCustomHeader, async (req, res) => {
    const { flow, user, company_phone_id } = req.body;

    if (!flow) {
      res.status(400).json({ message: "Required parameters are missing." });
      return;
    }

    try {
      await flowModel.createUpdateFlow(flow, user.company_id, company_phone_id);
      res.json({ message: "Flows created or updated successfully." });
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ message: "Error creating or updating the flows." });
    }
  });

  return router;
}
