import express from "express";
import { verifyToken } from "../middlewares/auth.js";
import { validateCustomHeader } from "../middlewares/customHeader.js";
import { QuickAnswerModel } from "../models/QuickAnswerModel.js";

const router = express.Router();

export default function QuickAnswerRoutes(pool) {
  const quickAnswerModel = new QuickAnswerModel(pool);

  /**
   * @swagger
   * tags:
   *   name: Quick-Answer
   *   description: Tag API
   */

  /**
   * @swagger
   * /quick-answer/{company_phone_id}:
   *   post:
   *     tags: [Quick-Answer]
   *     summary: Create a new quick-answer
   *     parameters:
   *       - in: path
   *         name: company_phone_id
   *         type: integer
   *         required: true
   *         description: Company Phone ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               messageData:
   *                 type: string
   *               coincidences:
   *                 type: array
   *                 items:
   *                   type: string
   *               status:
   *                 type: integer
   *     responses:
   *       201:
   *         description: quick-answer created successfully
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error creating the quick-answer
   */
  router.post(
    "/:company_phone_id",
    verifyToken,
    validateCustomHeader,
    async (req, res) => {
      const { messageData, coincidences, status, user } = req.body;
      let { company_phone_id } = req.params;

      if (!messageData || !coincidences || !company_phone_id) {
        res.status(400).json({ message: "Required parameters are missing." });
        return;
      }

      try {
        const tag = await quickAnswerModel.createQuickAnswer(
          messageData,
          coincidences,
          status,
          user.company_id,
          company_phone_id
        );
        res.status(201).json(tag);
      } catch (error) {
        console.log(error);

        res.status(500).json({ message: "Error creating the quick-answer." });
      }
    }
  );

  /**
   * @swagger
   * /quick-answer/{company_phone_id}:
   *   get:
   *     tags: [Quick-Answer]
   *     summary: Get all quick-answers
   *     parameters:
   *       - in: path
   *         name: company_phone_id
   *         type: integer
   *         required: true
   *         description: Company Phone ID
   *     responses:
   *       200:
   *         description: Returns the quick-answers
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error getting the quick-answers
   */
  router.get(
    "/:company_phone_id",
    verifyToken,
    validateCustomHeader,
    async (req, res) => {
      try {
        const { user } = req.body;
        let { company_phone_id } = req.params;

        if (!company_phone_id) {
          res.status(400).json({ message: "Required parameters are missing." });
          return;
        }

        const tags = await quickAnswerModel.getQuickAnswers(
          user.company_id,
          company_phone_id
        );
        res.json(tags);
      } catch (error) {
        res.status(500).json({ message: "Error getting the quick-answers." });
      }
    }
  );

  /**
   * @swagger
   * /quick-answer/{id}/{company_phone_id}:
   *   get:
   *     tags: [Quick-Answer]
   *     summary: Get a quick-answer by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         description: Quick Answer ID
   *         required: true
   *         type: string
   *       - in: path
   *         name: company_phone_id
   *         type: integer
   *         required: true
   *         description: Company Phone ID
   *     responses:
   *       200:
   *         description: Quick-answer found
   *       401:
   *         description: Unauthorized access
   *       404:
   *         description: Quick-answers not found
   *       500:
   *         description: Error getting the quick-answers
   */
  router.get(
    "/:id/:company_phone_id",
    verifyToken,
    validateCustomHeader,
    async (req, res) => {
      const { id, company_phone_id } = req.params;
      const { user } = req.body;

      if (!id || !company_phone_id) {
        res.status(400).json({ message: "Required parameters are missing." });
        return;
      }

      try {
        const tag = await quickAnswerModel.getQuickAnswerById(
          id,
          user.company_id,
          company_phone_id
        );
        if (tag) {
          res.json(tag);
        } else {
          res.status(404).json({ message: "Quick-answers not found." });
        }
      } catch (error) {
        res.status(500).json({ message: "Error getting the quick-answers." });
      }
    }
  );

  /**
   * @swagger
   * /quick-answer/{id}/{company_phone_id}:
   *   put:
   *     tags: [Quick-Answer]
   *     summary: Update a quick-answer
   *     parameters:
   *       - in: path
   *         name: id
   *         description: Quick-answer ID
   *         required: true
   *         type: string
   *       - in: path
   *         name: company_phone_id
   *         type: integer
   *         required: true
   *         description: Company Phone ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               messageData:
   *                 type: string
   *               coincidences:
   *                 type: array
   *                 items:
   *                   type: string
   *               status:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Quick-answer updated successfully
   *       400:
   *         description: Required parameters are missing
   *       404:
   *         description: Quick-answer not found
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error updating the quick-answer
   */
  router.put(
    "/:id/:company_phone_id",
    verifyToken,
    validateCustomHeader,
    async (req, res) => {
      const { id, company_phone_id } = req.params;
      const { messageData, coincidences, status, user } = req.body;

      if (!messageData || !coincidences || !company_phone_id || !id) {
        res.status(400).json({ message: "Required parameters are missing." });
        return;
      }

      try {
        const quickAnswer = await quickAnswerModel.updateQuickAnswer(
          id,
          messageData,
          coincidences,
          status,
          user.company_id,
          company_phone_id
        );
        if (quickAnswer) {
          res.json(quickAnswer);
        } else {
          res.status(404).json({ message: "Quick-answer not found." });
        }
      } catch (error) {
        res.status(500).json({ message: "Error updating the quick-answer." });
      }
    }
  );

  /**
   * @swagger
   * /quick-answer/{id}/{company_phone_id}:
   *   delete:
   *     tags: [Quick-Answer]
   *     summary: Delete a quick-answer
   *     parameters:
   *       - in: path
   *         name: id
   *         description: Quick-Answer ID
   *         required: true
   *         type: string
   *       - in: path
   *         name: company_phone_id
   *         type: integer
   *         required: true
   *         description: Company Phone ID
   *     responses:
   *       200:
   *         description: Quick-answer deleted successfully
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error deleting the quick-answer
   */
  router.delete(
    "/:id/:company_phone_id",
    verifyToken,
    validateCustomHeader,
    async (req, res) => {
      const { user } = req.body;
      const { id, company_phone_id } = req.params;

      if (!company_phone_id || !id) {
        res.status(400).json({ message: "Required parameters are missing." });
        return;
      }

      try {
        await quickAnswerModel.deleteQuickAnswer(
          id,
          user.company_id,
          company_phone_id
        );
        res.json({ message: "Quick-answer deleted successfully." });
      } catch (error) {
        res.status(500).json({ message: "Error deleting the quick-answer." });
      }
    }
  );

  return router;
}
