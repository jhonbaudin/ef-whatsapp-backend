export class QuickAnswerModel {
  constructor(pool) {
    this.pool = pool;
  }

  async createQuickAnswer(
    messageData,
    coincidences,
    status = 1,
    company_id,
    company_phone_id
  ) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
        INSERT INTO quick_answer ("messageData", coincidences, status, company_id, company_phone_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
        [
          JSON.stringify(messageData),
          JSON.stringify(coincidences),
          status,
          company_id,
          company_phone_id,
        ]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error("Error creating quick answer");
    } finally {
      await client.release(true);
    }
  }

  async getQuickAnswers(company_id, company_phone_id) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "SELECT * FROM quick_answer WHERE company_id = $1 AND company_phone_id = $2 ORDER BY id",
        [company_id, company_phone_id]
      );
      return result.rows;
    } catch (error) {
      throw new Error("Error fetching quick answers");
    } finally {
      await client.release(true);
    }
  }

  async getQuickAnswerById(id, company_id, company_phone_id) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "SELECT * FROM quick_answer WHERE id = $1 AND company_id = $2 AND company_phone_id = $3",
        [id, company_id, company_phone_id]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error("Error fetching quick answers");
    } finally {
      await client.release(true);
    }
  }

  async updateQuickAnswer(
    id,
    messageData,
    coincidences,
    status = 1,
    company_id,
    company_phone_id
  ) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
        UPDATE quick_answer
        SET "messageData" = $1, coincidences = $2, status = $3
        WHERE id = $4 AND company_id = $5 AND company_phone_id = $6
        RETURNING *
      `,
        [
          JSON.stringify(messageData),
          JSON.stringify(coincidences),
          status,
          id,
          company_id,
          company_phone_id,
        ]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error("Error updating quick answers");
    } finally {
      await client.release(true);
    }
  }

  async deleteQuickAnswer(id, company_id, company_phone_id) {
    const client = await this.pool.connect();

    try {
      await client.query(
        "DELETE FROM quick_answer WHERE id = $1 AND company_id = $2 AND company_phone_id = $3",
        [id, company_id, company_phone_id]
      );
    } catch (error) {
      throw new Error("Error deleting quick answers");
    } finally {
      await client.release(true);
    }
  }
}
