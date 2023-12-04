export class TagModel {
  constructor(pool) {
    this.pool = pool;
  }

  async createTag(name, description, color, company_id) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
      INSERT INTO tags (name, description, color, company_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
        [name, description, color, company_id]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error("Error creating tag");
    } finally {
      await client.release(true);
    }
  }

  async getTags(company_id) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "SELECT * FROM tags WHERE company_id = $1 ORDER BY id",
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
        "SELECT * FROM tags WHERE id = $1 AND company_id = $2",
        [id, company_id]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error("Error fetching tag");
    } finally {
      await client.release(true);
    }
  }

  async updateTag(id, name, description, color, company_id) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
      UPDATE tags
      SET name = $1, description = $2, color = $3
      WHERE id = $4 AND company_id = $5
      RETURNING *
    `,
        [name, description, color, id, company_id]
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
