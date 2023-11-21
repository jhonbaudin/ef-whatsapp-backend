import dotenv from "dotenv";
import { TemplateController } from "../thirdParty/whatsappCloudAPI/templateController.js";

dotenv.config();

export class TemplateModel {
  constructor(pool) {
    this.pool = pool;
    this.templateController = new TemplateController();
  }

  async deleteTemplateById(company_phone_id, templateId) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `
        DELETE FROM template_components
        WHERE template_id = $1
      `,
        [templateId]
      );

      await client.query(
        `
        DELETE FROM templates
        WHERE id = $1 AND company_phone_id = $2
      `,
        [templateId, company_phone_id]
      );

      await client.query("COMMIT");

      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      return false;
    } finally {
      client.release();
    }
  }

  async getTemplateById(company_phone_id, templateId) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
        SELECT templates.*, template_components.component
        FROM templates
        LEFT JOIN template_components ON templates.id = template_components.template_id
        WHERE templates.id = $1 AND company_phone_id = $2
      `,
        [templateId, company_phone_id]
      );

      if (result.rows.length === 0) {
        throw new Error("Template not found.");
      }

      const template = result.rows.reduce((acc, row) => {
        if (!acc.id) {
          const { component, ...templateData } = row;
          acc = { id: templateId, ...templateData, components: [] };
        }

        if (row.component) {
          acc.components.push(row.component);
        }

        return acc;
      }, {});

      return template;
    } catch (error) {
      return null;
    } finally {
      client.release();
    }
  }

  async getAllTemplates(company_phone_id) {
    const client = await this.pool.connect();

    try {
      const templatesResult = await client.query(
        `
        SELECT templates.*, template_components.component
        FROM templates
        LEFT JOIN template_components ON templates.id = template_components.template_id
        WHERE templates.status = $1 AND company_phone_id = $2
      `,
        ["APPROVED", company_phone_id]
      );

      const templatesMap = templatesResult.rows.reduce((map, row) => {
        const { id, component, ...templateData } = row;
        const template = map.get(id);

        if (template) {
          template.components.push(component);
        } else {
          map.set(id, { id: id, ...templateData, components: [component] });
        }

        return map;
      }, new Map());

      return Array.from(templatesMap.values());
    } catch (error) {
      throw new Error("Error getting the templates.");
    } finally {
      client.release();
    }
  }

  async insertOrUpdateTemplate(templateData, company_phone_id) {
    const { template } = templateData;
    const client = await this.pool.connect();

    try {
      const { name, language, status, category, id, components } = template;
      const result = await client.query(
        "SELECT id FROM templates WHERE whatsapp_template_id = $1 AND company_phone_id = $2 LIMIT 1",
        [id, company_phone_id]
      );
      let templateId = 0;

      if (result.rows.length > 0) {
        templateId = result.rows[0].id;
        await client.query(
          "UPDATE templates SET language = $1, status = $2, category = $3, name =$4 WHERE id = $5",
          [language, status, category, name, templateId]
        );
        await client.query(
          "DELETE FROM template_components WHERE template_id = $1",
          [templateId]
        );
      } else {
        const insertResult = await client.query(
          "INSERT INTO templates (name, language, status, category, whatsapp_template_id, company_phone_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
          [name, language, status, category, id, company_phone_id]
        );
        templateId = insertResult.rows[0].id;
      }

      const insertValues = components.map(
        (component, index) => `($${index * 2 + 1}, $${index * 2 + 2})`
      );
      const insertParams = components.flatMap((component) => [
        templateId,
        JSON.stringify(component),
      ]);

      await client.query(
        `INSERT INTO template_components (template_id, component) VALUES ${insertValues.join(
          ", "
        )}`,
        insertParams
      );

      return true;
    } catch (error) {
      console.log(error);
      return false;
    } finally {
      client.release();
    }
  }

  async importTemplates(company_phone_id) {
    try {
      const client = await this.pool.connect();

      const result = await client.query(
        "SELECT * FROM companies_phones WHERE id = $1",
        [company_phone_id]
      );
      if (result.rows.length > 0) {
        const waba_id = result.rows[0].waba_id;
        const wp_bearer_token = result.rows[0].wp_bearer_token;
        const data = await this.templateController.importTemplates(
          waba_id,
          wp_bearer_token
        );
        if (Array.isArray(data?.data)) {
          await Promise.all(
            data.data.map((template) =>
              this.insertOrUpdateTemplate({ template }, company_phone_id)
            )
          );
          return true;
        }
      }
      client.release();

      return false;
    } catch (error) {
      console.log(error);
      return false;
    } finally {
      client.release();
    }
  }
}
