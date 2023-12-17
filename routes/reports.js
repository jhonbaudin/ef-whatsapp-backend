import { Router } from "express";
import { verifyToken } from "../middlewares/auth.js";
import { validateCustomHeader } from "../middlewares/customHeader.js";
import { ReportModel } from "../models/ReportModel.js";

const router = Router();

export default function reportRoutes(pool) {
  const reportModel = new ReportModel(pool);

  /**
   * @swagger
   * tags:
   *   name: Report
   *   description: Report API
   */

  /**
   * @swagger
   * /report:
   *   get:
   *     tags: [Report]
   *     summary: Get main dashboard report
   *     parameters:
   *       - in: query
   *         name: initDate
   *         schema:
   *           type: date
   *         description: Filter by init date, yyyy-m-d H:i:s
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: date
   *         description: Filter by end date, yyyy-m-d H:i:s
   *     responses:
   *       200:
   *         description: Returns the report
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error getting the report
   */
  router.get("/", verifyToken, validateCustomHeader, async (req, res) => {
    const { user } = req.body;
    let { initDate, endDate } = req.query;

    try {
      const report = await reportModel.getReport(
        user.company_id,
        initDate,
        endDate
      );
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Error getting the report." });
    }
  });

  return router;
}
