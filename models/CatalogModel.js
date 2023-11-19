import dotenv from "dotenv";
import { parseString } from "xml2js";
dotenv.config();

export class CatalogModel {
  constructor(pool) {
    this.pool = pool;
  }

  async getCatalog(company_phone_id, filters) {
    const client = await this.pool.connect();

    try {
      let query = `
      SELECT id, g_id, description, image_link, link, title, price, presentation, additional_image_link, status 
      FROM public.product_catalog 
      WHERE company_phone_id = $1
    `;

      if (filters) {
        const { keyword, g_id, title, price, presentation } = filters;

        if (keyword) {
          query += ` AND LOWER(description) LIKE LOWER('%${keyword}%')`;
        }

        if (g_id) {
          query += ` AND g_id = ${g_id}`;
        }

        if (title) {
          query += ` AND LOWER(title) LIKE LOWER('%${title}%')`;
        }

        if (price) {
          query += ` AND price LIKE '%${price}%'`;
        }

        if (presentation) {
          query += ` AND LOWER(presentation) LIKE LOWER('%${presentation}%')`;
        }
      }

      const catalog = await client.query(query, [company_phone_id]);
      return catalog.rows;
    } catch (error) {
      throw new Error("Error getting the catalog.");
    } finally {
      client.release();
    }
  }

  async getProductById(company_phone_id, id) {
    const client = await this.pool.connect();

    try {
      const catalog = await client.query(
        `SELECT id, g_id, description, image_link, link, title, price, presentation, additional_image_link, status FROM public.product_catalog WHERE company_phone_id = $1 AND id = $2`,
        [company_phone_id, id]
      );

      return catalog.rows[0];
    } catch (error) {
      throw new Error("Error getting the product.");
    } finally {
      client.release();
    }
  }

  async importCatalog(company_phone_id, url) {
    const client = await this.pool.connect();

    try {
      const response = await fetch(url);
      const xml = await response.text();
      const result = await new Promise((resolve, reject) => {
        parseString(xml, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });

      const items = result.rss.channel[0].item;
      await client.query("BEGIN");

      try {
        for (const item of items) {
          const g_id = item["g:id"][0];
          const description = item["g:description"]
            ? item["g:description"][0]
            : "";
          const image_link = item["g:image_link"]
            ? item["g:image_link"][0]
            : null;
          const link = item["g:link"] ? item["g:link"][0] : null;
          const title = item["g:title"] ? item["g:title"][0] : null;
          const price = item["g:price"] ? item["g:price"][0] : 0;
          const presentation = item["presentacion"]
            ? item["presentacion"][0]
            : null;
          const additional_image_link = item["g:additional_image_link"]
            ? item["g:additional_image_link"][0]
            : null;

          const existingProduct = await client.query(
            "SELECT * FROM product_catalog WHERE g_id = $1",
            [g_id]
          );

          if (existingProduct.rows.length > 0) {
            await client.query(
              "UPDATE product_catalog SET description = $1, image_link = $2, link = $3, title = $4, price = $5, presentation = $6, additional_image_link = $7, status = $8 WHERE g_id = $9",
              [
                description,
                image_link,
                link,
                title,
                price,
                presentation,
                additional_image_link,
                1,
                g_id,
              ]
            );
          } else {
            await client.query(
              "INSERT INTO product_catalog (g_id, description, image_link, link, title, price, presentation, additional_image_link, company_phone_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
              [
                g_id,
                description,
                image_link,
                link,
                title,
                price,
                presentation,
                additional_image_link,
                company_phone_id,
                1,
              ]
            );
          }
        }

        await client.query(
          `UPDATE product_catalog SET status = $1 WHERE g_id NOT IN (${items
            .map((item) => item["g:id"][0])
            .join(",")})`,
          [0]
        );

        await client.query("COMMIT");
      } catch (error) {
        console.log(error);
        await client.query("ROLLBACK");
        await client.query(
          "SELECT setval('product_catalog_id_seq', (SELECT MAX(id) FROM product_catalog))"
        );
        throw new Error("Error parsing the catalog.");
      }

      return true;
    } catch (error) {
      throw new Error("Error proccesing the catalog.");
    } finally {
      client.release();
    }
  }
}
