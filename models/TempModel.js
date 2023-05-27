export class TempModel {
  constructor(pool) {
    this.pool = pool;
  }

  async createTemp(jsonData) {
    const client = await this.pool.connect();

    try {
      const query =
        'INSERT INTO client."temp" ("json") VALUES ($1) RETURNING *';
      const values = [jsonData];
      const result = await client.query(query, values);
      const temp = result.rows[0];
      return temp;
    } catch (error) {
      throw new Error("Error creating temp", error);
    } finally {
      client.release();
    }
  }
}
