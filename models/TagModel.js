export class TagModel {
  constructor(pool) {
    this.pool = pool;
  }

  async createTag(
    name,
    description,
    color,
    hasNestedForm,
    fields = null,
    company_id
  ) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
      INSERT INTO tags (name, description, color, has_nested_form, fields, company_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
        [
          name,
          description,
          color,
          hasNestedForm,
          fields ? JSON.stringify(fields) : null,
          company_id,
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.log(error);
      throw new Error("Error creating tag");
    } finally {
      await client.release(true);
    }
  }

  async getTags(company_id) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `SELECT id, "name", description, color, company_id, fields, has_nested_form as "hasNestedForm" FROM tags WHERE company_id = $1 ORDER BY id`,
        [company_id]
      );

      return result.rows;
    } catch (error) {
      throw new Error("Error fetching tags");
    } finally {
      await client.release(true);
    }
  }

  async getTagById(id, company_id) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `SELECT id, "name", description, color, company_id, fields, has_nested_form as "hasNestedForm" FROM tags WHERE id = $1 AND company_id = $2`,
        [id, company_id]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error("Error fetching tag");
    } finally {
      await client.release(true);
    }
  }

  async updateTag(
    id,
    name,
    description,
    color,
    hasNestedForm,
    fields = null,
    company_id
  ) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
      UPDATE tags
      SET name = $1, description = $2, color = $3, has_nested_form = $4, fields = $5
      WHERE id = $6 AND company_id = $7
      RETURNING *
    `,
        [
          name,
          description,
          color,
          hasNestedForm,
          fields ? JSON.stringify(fields) : null,
          id,
          company_id,
        ]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error("Error updating tag");
    } finally {
      await client.release(true);
    }
  }

  async deleteTag(id, company_id) {
    const client = await this.pool.connect();

    try {
      await client.query(
        `DELETE FROM conversations_tags ct
          WHERE ct.tag_id = $1`,
        [id]
      );
      await client.query("DELETE FROM tags WHERE id = $1 AND company_id = $2", [
        id,
        company_id,
      ]);
    } catch (error) {
      throw new Error("Error deleting tag");
    } finally {
      await client.release(true);
    }
  }
}
