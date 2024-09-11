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
            m.status = $3
            AND TO_TIMESTAMP(m.created_at) BETWEEN $1 AND $2
        GROUP BY
            c.company_phone_id, cp.phone, cp.alias`,
        [initDate, endDate, "client"]
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

  async getDetailsReport(company_id, initDate = null, endDate = null) {
    const client = await this.pool.connect();
    if ((!initDate || !endDate) && limit == "") {
      throw new Error("Incorrect parameters");
    }
    try {
      const report = {
        conversaciones: [],
        mensajesRecibidos: [],
        mensajesEnviados: [],
        mensajesEnviadosBot: [],
        mensajesRecibidosCampanias: [],
      };
      const conversaciones = await client.query(
        `SELECT
            c.id,
            cp.alias,
            cp.phone AS tlf_empresa,
            to_timestamp(c.last_message_time) AS fecha_ultimo_mensaje,
            c2.phone AS tlf_cliente,
            c2."name" AS nombre_cliente,
            STRING_AGG(t.name, ', ') AS tags
        FROM
            conversations c
        JOIN
            companies_phones cp ON cp.id = c.company_phone_id
        JOIN
            contacts c2 ON c.contact_id = c2.id
        LEFT JOIN
            conversations_tags ct ON ct.conversation_id = c.id
        LEFT JOIN
            tags t ON ct.tag_id = t.id
        WHERE
            c.created_at BETWEEN $1 AND $2
        GROUP BY
            c.id, cp.alias, cp.phone, c.last_message_time, c2.phone, c2.name;
        `,
        [initDate, endDate]
      );

      const mensajesRecibidos = await client.query(
        `SELECT
            m.id,
            message_type AS tipo_mensaje,
            c.id AS id_conversacion,
            cp.alias,
            cp.phone AS tlf_empresa,
            c2.phone AS tlf_cliente,
            c2."name" AS nombre_cliente,
            to_timestamp(m.created_at) AS fecha_mensaje
        FROM
            messages m
        JOIN
            conversations c ON c.id = m.conversation_id
        JOIN
            companies_phones cp ON cp.id = c.company_phone_id
        JOIN
            contacts c2 ON c.contact_id = c2.id
        WHERE
            to_timestamp(m.created_at) BETWEEN $1 AND $2
            AND m.status = $3
        `,
        [initDate, endDate, "client"]
      );

      const mensajesEnviados = await client.query(
        `SELECT
            m.id,
            message_type AS tipo_mensaje,
            c.id AS id_conversacion,
            cp.alias,
            cp.phone AS tlf_empresa,
            c2.phone AS tlf_cliente,
            c2."name" AS nombre_cliente,
            to_timestamp(m.created_at) AS fecha_mensaje
        FROM
            messages m
        JOIN
            conversations c ON c.id = m.conversation_id
        JOIN
            companies_phones cp ON cp.id = c.company_phone_id
        JOIN
            contacts c2 ON c.contact_id = c2.id
        WHERE
            to_timestamp(m.created_at) BETWEEN $1 AND $2
            AND m.status <> $3;
        `,
        [initDate, endDate, "client"]
      );

      const mensajesEnviadosBot = await client.query(
        `SELECT
            q.id,
            q.message,
            c.id AS id_conversacion,
            cp.alias,
            cp.phone AS tlf_empresa,
            c2.phone AS tlf_cliente,
            c2."name" AS nombre_cliente,
            q.created_at AS fecha_mensaje
        FROM
            queue q
        JOIN
            conversations c ON c.id = q.conversation_id
        JOIN
            companies_phones cp ON cp.id = c.company_phone_id
        JOIN
            contacts c2 ON c.contact_id = c2.id
        WHERE
            q.created_at BETWEEN $1 AND $2;
        `,
        [initDate, endDate]
      );

      const mensajesRecibidosCampanias = await client.query(
        `SELECT
            m.id,
            message_type AS tipo_mensaje,
            c.id AS id_conversacion,
            cp.alias,
            cp.phone AS tlf_empresa,
            c2.phone AS tlf_cliente,
            c2."name" AS nombre_cliente,
            to_timestamp(m.created_at) AS fecha_mensaje
        FROM
            messages m
        JOIN
            messages_referral mr ON	mr.message_id = m.id
        JOIN
            conversations c ON c.id = m.conversation_id
        JOIN
            companies_phones cp ON cp.id = c.company_phone_id
        JOIN
            contacts c2 ON c.contact_id = c2.id
        WHERE
            to_timestamp(m.created_at) BETWEEN $1 AND $2
            AND m.status = $3
        `,
        [initDate, endDate, "client"]
      );

      report.conversaciones = conversaciones.rows;
      report.mensajesRecibidos = mensajesRecibidos.rows;
      report.mensajesEnviados = mensajesEnviados.rows;
      report.mensajesEnviadosBot = mensajesEnviadosBot.rows;
      report.mensajesRecibidosCampanias = mensajesRecibidosCampanias.rows;

      return report;
    } catch (error) {
      console.log(error);

      throw new Error("Error fetching report");
    } finally {
      await client.release(true);
    }
  }
}
