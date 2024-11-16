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
   * /template/{company_phone_id}:
   *   get:
   *     tags: [Template]
   *     summary: Get all templates
   *     description: Get all templates per company phone id.
   *     parameters:
   *       - name: company_phone_id
   *         in: path
   *         description: Company Phone ID
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: links
   *         schema:
   *           type: boolean
   *         description: Filter by header links type
   *     responses:
   *       200:
   *         description: Returns the templates
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error getting the templates.
   */
  router.get(
    "/:company_phone_id",
    validateCustomHeader,
    verifyToken,
    async (req, res) => {
      const { company_phone_id } = req.params;
      const { links } = req.query;

      if (!company_phone_id) {
        res.status(400).json({ message: "Required parameters are missing." });
        return;
      }

      try {
        const templates = await templateModel.getAllTemplates(
          company_phone_id,
          links
        );
        res.status(200).json({ templates });
      } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error getting the templates." });
      }
    }
  );

  /**
   * @swagger
   * /template/import/{company_phone_id}:
   *   get:
   *     tags: [Template]
   *     summary: Import templates
   *     description: Import templates from company phone id.
   *     parameters:
   *       - name: company_phone_id
   *         in: path
   *         description: Company Phone ID
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Templates imported successfully.
   *       500:
   *         description: Error importing templates.
   */
  router.get("/import/:company_phone_id", async (req, res) => {
    try {
      const { company_phone_id } = req.params;

      if (!company_phone_id) {
        res.status(400).json({ message: "Required parameters are missing." });
        return;
      }

      const success = await templateModel.importTemplates(company_phone_id);
      if (success) {
        res.status(200).json({ message: "Templates imported successfully" });
      } else {
        console.log(success);
        res.status(500).json({ message: "Error importing templates" });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Error importing templates" });
    }
  });

  /**
   * @swagger
   * /template/{company_phone_id}/{id}:
   *   get:
   *     tags: [Template]
   *     summary: Get a template by ID
   *     parameters:
   *       - name: company_phone_id
   *         in: path
   *         description: Company phone ID
   *         required: true
   *         schema:
   *           type: string
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
  router.get(
    "/:company_phone_id/:id",
    validateCustomHeader,
    verifyToken,
    async (req, res) => {
      const { id, company_phone_id } = req.params;

      if (!id || !company_phone_id) {
        res.status(400).json({ message: "Required parameters are missing." });
        return;
      }

      try {
        const template = await templateModel.getTemplateById(
          company_phone_id,
          id
        );
        if (template) {
          res.status(200).json({ template });
        } else {
          res.status(404).json({ message: "Template not found." });
        }
      } catch (error) {
        res.status(500).json({ message: "Error getting the template." });
      }
    }
  );

  /**
   * @swagger
   * /template/{company_phone_id}/{id}:
   *   delete:
   *     tags: [Template]
   *     summary: Delete a template by ID
   *     parameters:
   *       - name: company_phone_id
   *         in: path
   *         description: Company phone ID
   *         required: true
   *         schema:
   *           type: string
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
  router.delete(
    "/:company_phone_id/:id",
    validateCustomHeader,
    verifyToken,
    async (req, res) => {
      const { id, company_phone_id } = req.params;

      if (!id || !company_phone_id) {
        res.status(400).json({ message: "Required parameters are missing." });
        return;
      }

      try {
        const deletedTemplate = await templateModel.deleteTemplateById(
          company_phone_id,
          id
        );
        if (deletedTemplate) {
          res.status(200).json({ message: "Template deleted successfully." });
        } else {
          res.status(404).json({ message: "Template not found." });
        }
      } catch (error) {
        res.status(500).json({ message: "Error deleting the template." });
      }
    }
  );

  return router;
}
