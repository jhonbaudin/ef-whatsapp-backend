export class ReportModel {
  constructor(pool) {
    this.pool = pool;
  }

  async getReport(company_id, initDate = null, endDate = null) {
    const client = await this.pool.connect();
    if ((!initDate || !endDate) && limit == "") {
      throw new Error("Incorrect parameters");
    }
    try {
      const report = {
        botMessages: [],
        receivedMessages: [],
        campaingMessages: [],
        totalConversations: [],
      };
      const botMessages = await client.query(
        `SELECT
            COUNT(q.id) AS total,
            cp.phone,
            cp.alias
        FROM
            queue q
        LEFT JOIN
            conversations c ON q.conversation_id = c.id
        JOIN
            companies_phones cp ON c.company_phone_id = cp.id
        WHERE
            q.created_at BETWEEN $1 AND $2
            AND q.processed = TRUE
        GROUP BY
            c.company_phone_id, cp.phone, cp.alias`,
        [initDate, endDate]
      );

      const receivedMessages = await client.query(
        `SELECT
            COUNT(m.id) AS total,
            cp.phone,
            cp.alias
        FROM
            messages m
        LEFT JOIN
            conversations c ON m.conversation_id = c.id
        JOIN
            companies_phones cp ON c.company_phone_id = cp.id
        WHERE
            m.status = 'client'
            AND TO_TIMESTAMP(m.created_at) BETWEEN $1 AND $2
        GROUP BY
            c.company_phone_id, cp.phone, cp.alias`,
        [initDate, endDate]
      );

      const campaingMessages = await client.query(
        `SELECT
            COUNT(m.id) AS total,
            cp.phone,
            cp.alias
        FROM
            messages_referral mr
        LEFT JOIN
            messages m ON mr.message_id = m.id
        LEFT JOIN
            conversations c ON m.conversation_id = c.id
        JOIN
            companies_phones cp ON c.company_phone_id = cp.id
        WHERE
            TO_TIMESTAMP(m.created_at) BETWEEN $1 AND $2
        GROUP BY
            c.company_phone_id, cp.phone, cp.alias`,
        [initDate, endDate]
      );
      const totalConversations = await client.query(
        `SELECT
            COUNT(c.id) AS total,
            cp.phone,
            cp.alias
        FROM
            conversations c
        JOIN
            companies_phones cp ON c.company_phone_id = cp.id
        WHERE
            c.created_at BETWEEN $1 AND $2
        GROUP BY
            c.company_phone_id, cp.phone, cp.alias`,
        [initDate, endDate]
      );

      report.botMessages = botMessages.rows;
      report.receivedMessages = receivedMessages.rows;
      report.campaingMessages = campaingMessages.rows;
      report.totalConversations = totalConversations.rows;

      return report;
    } catch (error) {
      console.log(error);

      throw new Error("Error fetching report");
    } finally {
      await client.release(true);
    }
  }
}
