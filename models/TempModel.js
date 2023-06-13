export class TempModel {
  constructor(pool) {
    this.pool = pool;
  }

  async createTemp(jsonData) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        'INSERT INTO client."temp" ("json") VALUES ($1) RETURNING *',
        [jsonData]
      );
      const temp = result.rows[0];
      return temp;
    } catch (error) {
      throw new Error("Error creating temp");
    } finally {
      client.release();
    }
  }

  async cron() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        "REFRESH MATERIALIZED VIEW client.vw_unprocessed_messages WITH DATA; SELECT client.process_temp_data();"
      );
      return result;
    } catch (error) {
      throw new Error("Error running cron");
    } finally {
      client.release();
    }
  }
}
