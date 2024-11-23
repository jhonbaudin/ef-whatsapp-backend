export class ScheduleModel {
  constructor(pool) {
    this.pool = pool;
  }

  async getScheduledTasks() {
    const client = await this.pool.connect();

    try {
      const result = await client.query(`
        SELECT
          st.id, 
          t."name",
          t.color,	
          cp.phone,
          cp.alias,
          u.username,
          jsonb_array_length(st.conversations) AS conversations_count,
          jsonb_array_length(st.phones) AS phones_count,
          to_char(st.dispatch_date, 'YYYY-MM-DD HH12:MI:SS AM') AS dispatch_date,
          to_char(st.created_at, 'YYYY-MM-DD HH12:MI:SS AM') AS created_at,
          st.processed,
          st.error,
          st.error_detail
        FROM
          scheduled_tasks st
        LEFT JOIN tags t ON t.id = st.tag
        LEFT JOIN companies_phones cp ON st.company_phone_id = cp.id
        LEFT JOIN users u ON st.user_id = u.id
      `);
      return result.rows;
    } catch (error) {
      throw new Error("Error fetching scheduled tasks");
    } finally {
      await client.release(true);
    }
  }
}
