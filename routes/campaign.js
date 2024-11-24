import express from "express";
import { CampaignModel } from "../models/CampaignModel.js";
import { verifyToken } from "../middlewares/auth.js";
import { validateCustomHeader } from "../middlewares/customHeader.js";

const router = express.Router();

export default function campaignRoutes(pool) {
  const campaignModel = new CampaignModel(pool);

  /**
   * @swagger
   * tags:
   *   name: Campaign
   *   description: Campaign Assign API
   */

  /**
   * @swagger
   * /campaign:
   *   get:
   *     summary: Get all campaigns
   *     tags: [Campaign]
   *     responses:
   *       200:
   *         description: Returns a list of campaigns
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Failed to get campaigns
   */
  router.get("/", verifyToken, validateCustomHeader, async (req, res) => {
    const { user } = req.body;

    try {
      const campaigns = await campaignModel.getCampaigns(user.company_id);
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ message: "Error getting the campaigns." });
    }
  });

  /**
   * @swagger
   * /campaign/{id}:
   *   get:
   *     summary: Get a campaign by ID
   *     tags: [Campaign]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: campaign ID
   *     responses:
   *       200:
   *         description: Found campaign
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       404:
   *         description: Campaign not found
   *       500:
   *         description: Failed to get the campaign
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
      const campaignFound = await campaignModel.getCampaignById(
        id,
        user.company_id
      );
      if (campaignFound) {
        res.json(campaignFound);
      } else {
        res.status(404).json({ message: "Campaign not found." });
      }
    } catch (error) {
      res.status(500).json({ message: "Error getting the campaign." });
    }
  });

  /**
   * @swagger
   * /campaign:
   *   post:
   *     summary: Create a new campaign
   *     tags: [Campaign]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               id_campaign:
   *                 type: integer
   *               tag_id:
   *                 type: integer
   *               users:
   *                 type: array
   *                 items:
   *                   type: integer
   *     responses:
   *       201:
   *         description: Success. Returns the created campaign
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       404:
   *         description: Conversation not found or no messages available
   *       500:
   *         description: Failed to create the campaign
   */
  router.post("/", verifyToken, validateCustomHeader, async (req, res) => {
    const { id_campaign, users, user, tag_id } = req.body;

    if (!id_campaign || !users) {
      res.status(400).json({ message: "Required parameters are missing." });
      return;
    }

    try {
      const newCampaign = await campaignModel.createCampaign(
        id_campaign,
        users,
        user.company_id,
        tag_id
      );
      res.status(201).json(newCampaign);
    } catch (error) {
      res.status(500).json({ message: "Error creating the campaign." });
    }
  });

  /**
   * @swagger
   * /campaign/{id}:
   *   put:
   *     summary: Update a campaign by ID
   *     tags: [Campaign]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Campaign ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               id_campaign:
   *                 type: integer
   *               tag_id:
   *                 type: integer
   *               users:
   *                 type: array
   *                 items:
   *                   type: integer
   *     responses:
   *       200:
   *         description: Returns the updated campaign
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       404:
   *         description: Campaign not found
   *       500:
   *         description: Failed to update the campaign
   */
  router.put("/:id", verifyToken, validateCustomHeader, async (req, res) => {
    const { id } = req.params;
    const { id_campaign, users, user, tag_id } = req.body;

    if (!id || !id_campaign || !users) {
      res.status(400).json({ message: "Required parameters are missing." });
      return;
    }

    try {
      const updatedCampaign = await campaignModel.updateCampaign(
        id,
        id_campaign,
        users,
        user.company_id,
        tag_id
      );
      if (updatedCampaign) {
        res.json(updatedCampaign);
      } else {
        res.status(404).json({ message: "Campaign not found." });
      }
    } catch (error) {
      res.status(500).json({ message: "Error updating the campaign." });
    }
  });

  /**
   * @swagger
   * /campaign/{id}:
   *   delete:
   *     tags: [Campaign]
   *     summary: Delete a campaign
   *     parameters:
   *       - in: path
   *         name: id
   *         description: Campaign ID
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: Campaign deleted successfully
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error deleting the campaign
   */
  router.delete("/:id", verifyToken, validateCustomHeader, async (req, res) => {
    const { id } = req.params;
    const { user } = req.body;

    if (!id) {
      res.status(400).json({ message: "Required parameters are missing." });
      return;
    }

    try {
      await campaignModel.deleteCampaign(id, user.company_id);
      res.json({ message: "Campaign deleted successfully." });
    } catch (error) {
      res.status(500).json({ message: "Error deleting the campaign." });
    }
  });

  return router;
}
