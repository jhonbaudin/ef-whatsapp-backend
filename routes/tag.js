import express from "express";
import { verifyToken } from "../middlewares/auth.js";
import { validateCustomHeader } from "../middlewares/customHeader.js";
import { TagModel } from "../models/TagModel.js";

const router = express.Router();

export default function tagRoutes(pool) {
  const tagModel = new TagModel(pool);

  /**
   * @swagger
   * tags:
   *   name: Tag
   *   description: Tag API
   */

  /**
   * @swagger
   * /tag:
   *   post:
   *     tags: [Tag]
   *     summary: Create a new tag
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               color:
   *                 type: string
   *           example:
   *             name: Example Tag
   *             description: This is an example tag
   *             color: #FF0000
   *     responses:
   *       201:
   *         description: Tag created successfully
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error creating the tag
   */
  router.post("/", verifyToken, validateCustomHeader, async (req, res) => {
    const { name, description, color, user } = req.body;

    if (!name || !color) {
      res.status(400).json({ message: "Required parameters are missing." });
      return;
    }

    try {
      const tag = await tagModel.createTag(
        name,
        description,
        color,
        user.company_id
      );
      res.status(201).json(tag);
    } catch (error) {
      res.status(500).json({ message: "Error creating the tag." });
    }
  });

  /**
   * @swagger
   * /tag:
   *   get:
   *     tags: [Tag]
   *     summary: Get all tags
   *     responses:
   *       200:
   *         description: Returns the tags
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error getting the tags
   */

  router.get("/", verifyToken, validateCustomHeader, async (req, res) => {
    try {
      const { user } = req.body;

      const tags = await tagModel.getTags(user.company_id);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Error getting the tags." });
    }
  });

  /**
   * @swagger
   * /tag/{id}:
   *   get:
   *     tags: [Tag]
   *     summary: Get a tag by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         description: Tag ID
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: Tag found
   *       401:
   *         description: Unauthorized access
   *       404:
   *         description: Tag not found
   *       500:
   *         description: Error getting the tag
   */
  router.get("/:id", verifyToken, validateCustomHeader, async (req, res) => {
    const { id } = req.params;
    const { user } = req.body;

    try {
      const tag = await tagModel.getTagById(id, user.company_id);
      if (tag) {
        res.json(tag);
      } else {
        res.status(404).json({ message: "Tag not found." });
      }
    } catch (error) {
      res.status(500).json({ message: "Error getting the tag." });
    }
  });

  /**
   * @swagger
   * /tag/{id}:
   *   put:
   *     tags: [Tag]
   *     summary: Update a tag
   *     parameters:
   *       - in: path
   *         name: id
   *         description: Tag ID
   *         required: true
   *         type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               color:
   *                 type: string
   *           example:
   *             name: Example Tag
   *             description: This is an example tag
   *             color: #FF0000
   *     responses:
   *       200:
   *         description: Tag updated successfully
   *       400:
   *         description: Required parameters are missing
   *       404:
   *         description: Tag not found
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error updating the tag
   */
  router.put("/:id", verifyToken, validateCustomHeader, async (req, res) => {
    const { id } = req.params;
    const { name, description, color, user } = req.body;

    if (!name || !color) {
      res.status(400).json({ message: "Required parameters are missing." });
      return;
    }

    try {
      const tag = await tagModel.updateTag(
        id,
        name,
        description,
        color,
        user.company_id
      );
      if (tag) {
        res.json(tag);
      } else {
        res.status(404).json({ message: "Tag not found." });
      }
    } catch (error) {
      res.status(500).json({ message: "Error updating the tag." });
    }
  });

  /**
   * @swagger
   * /tag/{id}:
   *   delete:
   *     tags: [Tag]
   *     summary: Delete a tag
   *     parameters:
   *       - in: path
   *         name: id
   *         description: Tag ID
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: Tag deleted successfully
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error deleting the tag
   */
  router.delete("/:id", verifyToken, validateCustomHeader, async (req, res) => {
    const { id } = req.params;
    const { user } = req.body;

    if (!id) {
      res.status(400).json({ message: "Required parameters are missing." });
      return;
    }

    try {
      await tagModel.deleteTag(id, user.company_id);
      res.json({ message: "Tag deleted successfully." });
    } catch (error) {
      res.status(500).json({ message: "Error deleting the tag." });
    }
  });

  return router;
}
