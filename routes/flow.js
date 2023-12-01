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
   * /flow/{company_phone_id}:
   *   get:
   *     summary: Get all flows
   *     tags: [Flow]
   *     parameters:
   *       - in: path
   *         name: company_phone_id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Company phone ID
   *     responses:
   *       200:
   *         description: Returns a list of flows
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Failed to get flows
   */
  router.get(
    "/:company_phone_id",
    verifyToken,
    validateCustomHeader,
    async (req, res) => {
      const { user } = req.body;
      const { company_phone_id } = req.params;

      if (!company_phone_id) {
        res.status(400).json({ message: "Required parameters are missing." });
        return;
      }

      try {
        const flows = await flowModel.getFlows(
          user.company_id,
          company_phone_id
        );
        res.json(flows);
      } catch (error) {
        res.status(500).json({ message: "Error getting the flows." });
      }
    }
  );

  /**
   * @swagger
   * /flow/{company_phone_id}/{flow_id}:
   *   get:
   *     summary: Get all flows by flow type
   *     tags: [Flow]
   *     parameters:
   *       - in: path
   *         name: company_phone_id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Company phone ID
   *       - in: path
   *         name: flow_id
   *         schema:
   *           type: string
   *         required: true
   *         description: Flow ID
   *     responses:
   *       200:
   *         description: Returns a list of flows grouped by flow type
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Failed to get flows
   */
  router.get(
    "/:company_phone_id/:flow_id",
    verifyToken,
    validateCustomHeader,
    async (req, res) => {
      const { user } = req.body;
      const { company_phone_id, flow_id } = req.params;

      if (!company_phone_id || !flow_id) {
        res.status(400).json({ message: "Required parameters are missing." });
        return;
      }

      try {
        const flows = await flowModel.getFlowsGrouped(
          user.company_id,
          company_phone_id,
          flow_id
        );
        res.json(flows);
      } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error getting the flows." });
      }
    }
  );

  /**
   * @swagger
   * /flow/{company_phone_id}:
   *   post:
   *     summary: Create or update flows
   *     tags: [Flow]
   *     parameters:
   *       - in: path
   *         name: company_phone_id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Company phone ID
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
   *                     node:
   *                       type: string
   *                     flow_id:
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
  router.post(
    "/:company_phone_id",
    verifyToken,
    validateCustomHeader,
    async (req, res) => {
      const { flow, user } = req.body;
      const { company_phone_id } = req.params;

      if (!flow || !company_phone_id) {
        res.status(400).json({ message: "Required parameters are missing." });
        return;
      }

      try {
        await flowModel.createUpdateFlow(
          flow,
          user.company_id,
          company_phone_id
        );
        res.json({ message: "Flows created or updated successfully." });
      } catch (error) {
        console.log(error);
        res
          .status(500)
          .json({ message: "Error creating or updating the flows." });
      }
    }
  );

  return router;
}
