import { Router } from "express";
import { verifyToken } from "../middlewares/auth.js";
import { validateCustomHeader } from "../middlewares/customHeader.js";
import { ContactModel } from "../models/ContactModel.js";
import fs from "fs";

const router = Router();

export default function contactRoutes(pool) {
  const contactModel = new ContactModel(pool);

  /**
   * @swagger
   * tags:
   *   name: Contact
   *   description: Contact API
   */

  /**
   * @swagger
   * /contact:
   *   post:
   *     tags: [Contact]
   *     summary: Create a new contact
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *               phone:
   *                 type: string
   *               country:
   *                 type: string
   *               name:
   *                 type: string
   *               type:
   *                 type: string
   *               tag_id:
   *                 type: integer
   *           example:
   *             email: example@example.com
   *             phone: +123456789
   *             country: Example Country
   *             name: Example Name
   *             type: client
   *             tag_id: 1
   *     responses:
   *       201:
   *         description: Contact created successfully
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error creating contact
   */
  router.post("/", verifyToken, validateCustomHeader, async (req, res) => {
    const { email, phone, country, name, type, user, tag_id } = req.body;

    if (!phone) {
      res.status(400).json({ message: "Required parameters are missing." });
      return;
    }

    try {
      const contact = await contactModel.createContact(
        email,
        phone,
        country,
        name,
        type,
        user.company_id,
        tag_id
      );
      res.status(201).json(contact);
    } catch (error) {
      res.status(500).json({ message: "Error creating contact." });
    }
  });

  /**
   * @swagger
   * /contact:
   *   get:
   *     tags: [Contact]
   *     summary: Get all contacts
   *     responses:
   *       200:
   *         description: Returns the contacts
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error getting the contacts
   */
  router.get("/", verifyToken, validateCustomHeader, async (req, res) => {
    const { user } = req.body;

    try {
      const contacts = await contactModel.getContacts(user.company_id);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Error getting the contacts." });
    }
  });

  /**
   * @swagger
   * /contact/{id}:
   *   get:
   *     tags: [Contact]
   *     summary: Get a contact by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         description: Contact ID
   *         required: true
   *         type: integer
   *     responses:
   *       200:
   *         description: Contact found
   *       401:
   *         description: Unauthorized access
   *       404:
   *         description: Contact not found
   *       500:
   *         description: Error getting the contact
   */
  router.get("/:id", verifyToken, validateCustomHeader, async (req, res) => {
    const { id } = req.params;
    const { user } = req.body;

    try {
      const contact = await contactModel.getContactById(id, user.company_id);
      if (contact) {
        res.json(contact);
      } else {
        res.status(404).json({ message: "Contact not found." });
      }
    } catch (error) {
      res.status(500).json({ message: "Error getting the contact." });
    }
  });

  /**
   * @swagger
   * /contact/{id}:
   *   put:
   *     tags: [Contact]
   *     summary: Update a contact
   *     parameters:
   *       - in: path
   *         name: id
   *         description: Contact ID
   *         required: true
   *         type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *               phone:
   *                 type: string
   *               country:
   *                 type: string
   *               name:
   *                 type: string
   *               type:
   *                 type: string
   *               tag_id:
   *                 type: integer
   *           example:
   *             email: example@example.com
   *             phone: +123456789
   *             country: Example Country
   *             name: Example Name
   *             type: client
   *             tag_id: 1
   *     responses:
   *       200:
   *         description: Contact updated successfully
   *       400:
   *         description: Required parameters are missing
   *       404:
   *         description: Contact not found
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error updating the contact
   */
  router.put("/:id", verifyToken, validateCustomHeader, async (req, res) => {
    const { id } = req.params;
    const { email, phone, country, name, type, user, tag_id } = req.body;

    try {
      const contact = await contactModel.updateContact(
        id,
        { email, phone, country, name, type, tag_id },
        user.company_id
      );
      if (contact) {
        res.json(contact);
      } else {
        res.status(404).json({ message: "Contact not found." });
      }
    } catch (error) {
      res.status(500).json({ message: "Error updating the contact." });
    }
  });

  /**
   * @swagger
   * /contact/{id}:
   *   delete:
   *     tags: [Contact]
   *     summary: Delete a contact
   *     parameters:
   *       - in: path
   *         name: id
   *         description: Contact ID
   *         required: true
   *         type: integer
   *     responses:
   *       200:
   *         description: Contact deleted successfully
   *       400:
   *         description: Required parameters are missing
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error deleting the contact
   */
  router.delete("/:id", verifyToken, validateCustomHeader, async (req, res) => {
    const { id } = req.params;
    const { user } = req.body;

    if (!id) {
      res.status(400).json({ message: "Required parameters are missing." });
      return;
    }

    try {
      await contactModel.deleteContact(id, user.company_id);
      res.json({ message: "Contact deleted successfully." });
    } catch (error) {
      res.status(500).json({ message: "Error deleting the contact." });
    }
  });

  /**
   * @swagger
   * /contact/import:
   *   post:
   *     tags: [Contact]
   *     summary: Import contacts from a base64 file
   *     consumes:
   *       - application/json
   *     parameters:
   *       - in: body
   *         name: file
   *         description: Base64 encoded file containing contacts data
   *         required: true
   *         schema:
   *           type: object
   *           properties:
   *             file:
   *               type: string
   *     responses:
   *       200:
   *         description: Contacts imported successfully
   *       400:
   *         description: Required parameters are missing or invalid file format
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error importing contacts
   */
  router.post(
    "/import",
    verifyToken,
    validateCustomHeader,
    async (req, res) => {
      const { user, file } = req.body;

      if (!file) {
        res.status(400).json({ message: "Required parameters are missing." });
        return;
      }

      const fileData = file.replace(/^data:.*,/, "");
      const tempFilePath = "/tmp/tempFile.csv";

      try {
        await fs.promises.writeFile(tempFilePath, fileData, "base64");
        await contactModel.importContactsFromCSV(tempFilePath, user.company_id);
        res.json({ message: "Contacts imported successfully." });
      } catch (error) {
        res.status(500).json({ message: "Error importing contacts." });
      } finally {
        fs.unlink(tempFilePath, (err) => {
          if (err) {
            console.error("Error deleting temporary file:", err);
          }
        });
      }
    }
  );

  return router;
}
