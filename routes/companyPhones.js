import express from "express";
import { CompanyModel } from "../models/CompanyModel.js";
import { verifyToken } from "../middlewares/auth.js";
import { validateCustomHeader } from "../middlewares/customHeader.js";

const router = express.Router();

export default function companyPhonesRoutes(pool) {
  const companyModel = new CompanyModel(pool);

  /**
   * @swagger
   * tags:
   *   name: Phone
   *   description: Company Phone API
   */

  /**
   * @swagger
   * /phone:
   *   get:
   *     summary: Get all phones
   *     tags: [Phone]
   *     responses:
   *       200:
   *         description: Returns a list of phones of a company
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Failed to get phones
   */
  router.get("/", verifyToken, validateCustomHeader, async (req, res) => {
    const { user } = req.body;

    try {
      const phones = await companyModel.getPhones(user.company_id);
      res.json(phones);
    } catch (error) {
      res.status(500).json({ message: "Error getting the phones." });
    }
  });

  /**
   * @swagger
   * /phone/{id}:
   *   get:
   *     summary: Get a phone by ID
   *     tags: [Phone]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Phone ID
   *     responses:
   *       200:
   *         description: Found phone
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       404:
   *         description: Phone not found
   *       500:
   *         description: Failed to get the phone
   *
   */
  router.get("/:id", verifyToken, validateCustomHeader, async (req, res) => {
    const { id } = req.params;
    const { user } = req.body;

    if (!id) {
      res.status(400).json({ message: "Required parameters are missing." });
      return;
    }

    try {
      const userFound = await companyModel.getPhoneById(id, user.company_id);
      if (userFound) {
        res.json(userFound);
      } else {
        res.status(404).json({ message: "Phone not found." });
      }
    } catch (error) {
      res.status(500).json({ message: "Error getting the phone." });
    }
  });

  /**
   * @swagger
   * /phone:
   *   post:
   *     summary: Create a new phone
   *     tags: [Phone]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               phone:
   *                 type: string
   *               wp_phone_id:
   *                 type: string
   *               waba_id:
   *                 type: string
   *               bussines_id:
   *                 type: string
   *               wp_bearer_token:
   *                 type: string
   *               alias:
   *                 type: string
   *               catalog_id:
   *                 type: string
   *               tag_id:
   *                 type: integer
   *     responses:
   *       201:
   *         description: Success. Returns the created phone
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       404:
   *         description: Company not found or no messages available
   *       500:
   *         description: Failed to create the phone
   */
  router.post("/", verifyToken, validateCustomHeader, async (req, res) => {
    const {
      phone,
      wp_phone_id,
      waba_id,
      bussines_id,
      wp_bearer_token,
      alias,
      catalog_id,
      user,
      tag_id,
    } = req.body;

    if (!phone) {
      res.status(400).json({ message: "Required parameters are missing." });
      return;
    }

    try {
      const newPhone = await companyModel.createPhone(
        phone,
        wp_phone_id,
        waba_id,
        bussines_id,
        wp_bearer_token,
        alias,
        catalog_id,
        user.company_id,
        tag_id
      );
      res.status(201).json(newPhone);
    } catch (error) {
      res.status(500).json({ message: "Error creating the phone." });
    }
  });

  /**
   * @swagger
   * /phone/{id}:
   *   put:
   *     summary: Update a phone by ID
   *     tags: [Phone]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Phone ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               phone:
   *                 type: string
   *               wp_phone_id:
   *                 type: string
   *               waba_id:
   *                 type: string
   *               bussines_id:
   *                 type: string
   *               wp_bearer_token:
   *                 type: string
   *               alias:
   *                 type: string
   *               catalog_id:
   *                 type: string
   *               tag_id:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Returns the updated phone
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       404:
   *         description: Phone not found
   *       500:
   *         description: Failed to update the phone
   */
  router.put("/:id", verifyToken, validateCustomHeader, async (req, res) => {
    const { id } = req.params;
    const {
      phone,
      wp_phone_id,
      waba_id,
      bussines_id,
      wp_bearer_token,
      alias,
      catalog_id,
      user,
      tag_id,
    } = req.body;

    if (!id || !phone) {
      res.status(400).json({ message: "Required parameters are missing." });
      return;
    }

    try {
      const updatedPhone = await companyModel.updatePhone(
        id,
        phone,
        wp_phone_id,
        waba_id,
        bussines_id,
        wp_bearer_token,
        alias,
        catalog_id,
        user.company_id,
        tag_id
      );
      if (updatedPhone) {
        res.json(updatedPhone);
      } else {
        res.status(404).json({ message: "Phone not found." });
      }
    } catch (error) {
      res.status(500).json({ message: "Error updating the phone." });
    }
  });

  /**
   * @swagger
   * /phone/{id}:
   *   delete:
   *     tags: [Phone]
   *     summary: Delete an phone
   *     parameters:
   *       - in: path
   *         name: id
   *         description: Phone ID
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: Phone deleted successfully
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error deleting the phone
   */
  router.delete("/:id", verifyToken, validateCustomHeader, async (req, res) => {
    const { id } = req.params;
    const { user } = req.body;

    if (!id) {
      res.status(400).json({ message: "Required parameters are missing." });
      return;
    }

    try {
      await companyModel.deletePhone(id, user.company_id);
      res.json({ message: "Phone deleted successfully." });
    } catch (error) {
      res.status(500).json({ message: "Error deleting the user." });
    }
  });

  return router;
}
