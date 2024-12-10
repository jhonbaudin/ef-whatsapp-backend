import csv from "csv-parser";
import fs from "fs";

export class ContactModel {
  constructor(pool) {
    this.pool = pool;
  }

  async createContact(email, phone, country, name, company_id, tag_id) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
          INSERT INTO contacts (email, phone, country, name, company_id, tag_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `,
        [email, phone, country, name, company_id, tag_id]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error("Error creating contact");
    } finally {
      await client.release(true);
    }
  }

  async getContacts(company_id) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "SELECT * FROM contacts WHERE company_id = $1",
        [company_id]
      );
      return result.rows;
    } catch (error) {
      throw new Error("Error fetching contacts");
    } finally {
      await client.release(true);
    }
  }

  async getContactById(id, company_id) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "SELECT id, email, phone, country, name, tag_id FROM contacts WHERE id = $1 AND company_id = $2",
        [id, company_id]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error("Error fetching contact");
    } finally {
      await client.release(true);
    }
  }

  async updateContact(id, fields, company_id) {
    const client = await this.pool.connect();
    const setClause = Object.keys(fields)
      .filter((key) => fields[key] !== undefined)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(", ");
    const values = Object.values(fields).filter((value) => value !== undefined);

    if (setClause.length === 0) {
      throw new Error("No fields to update");
    }

    try {
      const result = await client.query(
        `
          UPDATE contacts
          SET ${setClause}
          WHERE id = $${values.length + 1} AND company_id = $${
          values.length + 2
        }
          RETURNING *
        `,
        [...values, id, company_id]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error("Error updating contact");
    } finally {
      await client.release(true);
    }
  }

  async deleteContact(id, company_id) {
    const client = await this.pool.connect();

    try {
      await client.query(
        "DELETE FROM contacts WHERE id = $1 AND company_id = $2",
        [id, company_id]
      );
    } catch (error) {
      throw new Error("Error deleting contact");
    } finally {
      await client.release(true);
    }
  }

  async importContactsFromCSV(filePath, company_id) {
    const contacts = [];

    try {
      const stream = fs.createReadStream(filePath);

      for await (const data of stream.pipe(csv())) {
        contacts.push({
          email: data.email,
          phone: data.phone,
          country: data.country,
          name: data.name,
        });
      }

      const client = await this.pool.connect();

      try {
        await client.query("BEGIN");

        for (const contact of contacts) {
          await client.query(
            `
        INSERT INTO contacts (email, phone, country, name, company_id)
        VALUES ($1, $2, $3, $4, $5)
      `,
            [
              contact.email,
              contact.phone,
              contact.country,
              contact.name,
              company_id,
            ]
          );
        }

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error("Error importing contacts from CSV");
      } finally {
        await client.release(true);
      }
    } catch (error) {
      throw new Error("Error reading CSV file");
    }
  }
}
