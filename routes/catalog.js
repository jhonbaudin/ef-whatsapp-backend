import express from "express";
import { verifyToken } from "../middlewares/auth.js";
import { validateCustomHeader } from "../middlewares/customHeader.js";
import { CatalogModel } from "../models/CatalogModel.js";

const router = express.Router();

export default function catalogRoutes(pool) {
  const catalogModel = new CatalogModel(pool);

  /**
   * @swagger
   * tags:
   *   name: Catalog
   *   description: Product Catalog API
   */

  /**
   * @swagger
   * /catalog/import/{company_phone_id}:
   *   post:
   *     tags: [Catalog]
   *     summary: Import catalog
   *     description: Import catalog from company phone id.
   *     parameters:
   *       - name: company_phone_id
   *         in: path
   *         description: Company Phone ID
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               url:
   *                 type: string
   *     responses:
   *       200:
   *         description: Catalog imported successfully.
   *       500:
   *         description: Error importing catalog.
   */
  router.post("/import/:company_phone_id", async (req, res) => {
    try {
      const { company_phone_id } = req.params;
      const { url } = req.body;

      if (!company_phone_id || !url) {
        res.status(400).json({ message: "Required parameters are missing." });
        return;
      }

      const success = await catalogModel.importCatalog(company_phone_id, url);
      if (success) {
        res.status(200).json({ message: "Catalog imported successfully" });
      } else {
        res.status(500).json({ message: "Error importing catalog" });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Error importing catalog" });
    }
  });

  /**
   * @swagger
   * /catalog/{company_phone_id}:
   *   get:
   *     tags: [Catalog]
   *     summary: Get all products
   *     description: Get all products per company phone id.
   *     parameters:
   *       - name: company_phone_id
   *         in: path
   *         description: Company Phone ID
   *         required: true
   *         schema:
   *           type: string
   *       - name: keyword
   *         in: query
   *         description: Keyword for searching in description
   *         required: false
   *         schema:
   *           type: string
   *       - name: g_id
   *         in: query
   *         description: Product ID
   *         required: false
   *         schema:
   *           type: integer
   *       - name: title
   *         in: query
   *         description: Product title for searching
   *         required: false
   *         schema:
   *           type: string
   *       - name: price
   *         in: query
   *         description: Product price
   *         required: false
   *         schema:
   *           type: number
   *       - name: presentation
   *         in: query
   *         description: Product presentation for searching
   *         required: false
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Returns the catalog
   *       401:
   *         description: Unauthorized access
   *       500:
   *         description: Error getting the catalog.
   */
  router.get(
    "/:company_phone_id",
    validateCustomHeader,
    verifyToken,
    async (req, res) => {
      const { company_phone_id } = req.params;
      const { keyword, g_id, title, price, presentation } = req.query;

      if (!company_phone_id) {
        res.status(400).json({ message: "Required parameters are missing." });
        return;
      }

      try {
        const catalog = await catalogModel.getCatalog(company_phone_id, {
          keyword: keyword,
          g_id: g_id,
          title: title,
          price: price,
          presentation: presentation,
        });
        res.status(200).json({ catalog });
      } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error getting the catalog." });
      }
    }
  );

  /**
   * @swagger
   * /catalog/{company_phone_id}/{id}:
   *   get:
   *     tags: [Catalog]
   *     summary: Get a product by ID
   *     parameters:
   *       - name: company_phone_id
   *         in: path
   *         description: Company phone ID
   *         required: true
   *         schema:
   *           type: string
   *       - name: id
   *         in: path
   *         description: Product ID
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Returns the product
   *       401:
   *         description: Unauthorized access
   *       404:
   *         description: Product not found
   *       500:
   *         description: Error getting the product
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
        const product = await catalogModel.getProductById(company_phone_id, id);
        if (product) {
          res.status(200).json({ product });
        } else {
          res.status(404).json({ message: "Product not found." });
        }
      } catch (error) {
        res.status(500).json({ message: "Error getting the product." });
      }
    }
  );

  return router;
}
