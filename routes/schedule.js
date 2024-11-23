import express from "express";
import { verifyToken } from "../middlewares/auth.js";
import { validateCustomHeader } from "../middlewares/customHeader.js";
import { ScheduleModel } from "../models/ScheduleModel.js";

const router = express.Router();

export default function scheduleRoutes(pool) {
  const scheduleModel = new ScheduleModel(pool);

  /**
   * @swagger
   * tags:
   *   name: Schedule
   *   description: Schedule API
   */

  /**
   * @swagger
   * /schedule:
   *   get:
   *     tags: [Schedule]
   *     summary: Get all scheduled tasks
   *     responses:
   *       200:
   *         description: Returns the scheduled tasks
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error getting the scheduled tasks
   */
  router.get("/", verifyToken, validateCustomHeader, async (req, res) => {
    try {
      const tasks = await scheduleModel.getScheduledTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Error getting the scheduled tasks." });
    }
  });

  return router;
}
