import express from "express";
import { verifyToken } from "../middlewares/auth.js";
import { validateCustomHeader } from "../middlewares/customHeader.js";
import { TemplateModel } from "../models/TemplateModel.js";

const router = express.Router();

export default function templateRoutes(pool) {
  const templateModel = new TemplateModel(pool);

  /**
   * @swagger
   * tags:
   *   name: Template
   *   description: Template API
   */

  /**
   * @swagger
   * /template:
   *   get:
   *     tags: [Template]
   *     summary: Get all templates
   *     responses:
   *       200:
   *         description: Returns the templates
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error getting the templates.
   */
  router.get("/", validateCustomHeader, verifyToken, async (req, res) => {
    try {
      const templates = await templateModel.getAllTemplates();
      res.status(200).json({ templates });
    } catch (error) {
      res.status(500).json({ message: "Error getting the templates." });
    }
  });

  /**
   * @swagger
   * /template/import:
   *   get:
   *     tags: [Template]
   *     summary: Import templates
   *     description: Import templates from the specified URL.
   *     responses:
   *       200:
   *         description: Templates imported successfully.
   *       500:
   *         description: Error importing templates.
   */
  router.get("/import", async (req, res) => {
    try {
      const success = await templateModel.importTemplates();
      if (success) {
        res.status(200).json({ message: "Templates imported successfully" });
      } else {
        res.status(500).json({ message: "Error importing templates" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error importing templates" });
    }
  });

  /**
   * @swagger
   * /template/{id}:
   *   get:
   *     tags: [Template]
   *     summary: Get a template by ID
   *     parameters:
   *       - name: id
   *         in: path
   *         description: Template ID
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Returns the template
   *       401:
   *         description: Unauthorized access
   *       404:
   *         description: Template not found
   *       500:
   *         description: Error getting the template
   */
  router.get("/:id", validateCustomHeader, verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
      const template = await templateModel.getTemplateById(id);
      if (template) {
        res.status(200).json({ template });
      } else {
        res.status(404).json({ message: "Template not found." });
      }
    } catch (error) {
      res.status(500).json({ message: "Error getting the template." });
    }
  });

  /**
   * @swagger
   * /template/{id}:
   *   delete:
   *     tags: [Template]
   *     summary: Delete a template by ID
   *     parameters:
   *       - name: id
   *         in: path
   *         description: Template ID
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Template deleted successfully
   *       401:
   *         description: Unauthorized access
   *       404:
   *         description: Template not found
   *       500:
   *         description: Error deleting the template
   */
  router.delete("/:id", validateCustomHeader, verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
      const deletedTemplate = await templateModel.deleteTemplateById(id);
      if (deletedTemplate) {
        res.status(200).json({ message: "Template deleted successfully." });
      } else {
        res.status(404).json({ message: "Template not found." });
      }
    } catch (error) {
      res.status(500).json({ message: "Error deleting the template." });
    }
  });

  return router;
}
