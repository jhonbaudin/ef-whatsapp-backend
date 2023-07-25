import { QueueModel } from "./QueueModel.js";
import crypto from "crypto";

export class FlowModel {
  constructor(pool) {
    this.pool = pool;
    this.QueueModel = new QueueModel(this.pool);
  }

  async createUpdateFlow(flow, company_id, company_phone_id) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE public.auto_flow SET backup = backup + 1");
      const insertPromises = flow.map(async (f) => {
        await client.query(
          `INSERT INTO public.auto_flow ("source", source_handle, target, target_handle, id_relation, backup, company_id, template_data, company_phone_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            f.source,
            f.sourceHandle,
            f.target,
            f.targetHandle,
            f.id,
            0,
            company_id,
            f.template_data,
            company_phone_id,
          ]
        );
      });

      await Promise.all(insertPromises);
      await client.query("COMMIT");

      return true;
    } catch (error) {
      console.error(error);
      await client.query("ROLLBACK");
      throw new Error("Error creating flows");
    } finally {
      client.release();
    }
  }

  async getFlows(company_id, company_phone_id) {
    const client = await this.pool.connect();
    try {
      const queryResult = await client.query(
        `SELECT "source", source_handle AS "sourceHandle", target, target_handle AS "targetHandle", id_relation AS "id", template_data 
        FROM public.auto_flow 
        WHERE company_id = $1 AND company_phone_id = $2 AND backup = $3
        ORDER BY id`,
        [company_id, company_phone_id, 0]
      );
      return queryResult.rows;
    } catch (error) {
      throw new Error("Error fetching users");
    } finally {
      client.release();
    }
  }

  async getNextMessage(
    company_id,
    message_id,
    conversation_id,
    company_phone_id
  ) {
    const client = await this.pool.connect();
    const currentDate = new Date();
    const formattedDate = `${currentDate.getFullYear()}-${(
      "0" +
      (currentDate.getMonth() + 1)
    ).slice(-2)}-${("0" + currentDate.getDate()).slice(-2)}`;

    try {
      const isFirstMessage = await client.query(
        `SELECT
            COALESCE(c.last_message_time, EXTRACT(EPOCH FROM NOW())) AS last_message_time,
            m.status,
            (
              SELECT COUNT(id)
              FROM messages
              WHERE conversation_id = $2
            ) AS all_messages,
            (
              SELECT COUNT(CASE WHEN status <> 'client' THEN 1 END)
              FROM messages
              WHERE conversation_id = $2
            ) AS responses
          FROM conversations c
          LEFT JOIN (
            SELECT
                m.conversation_id,
                m.status
            FROM messages m
            WHERE m.id = $1
            ORDER BY m.created_at DESC
            LIMIT 1
          ) m ON c.id = m.conversation_id
          WHERE c.id = $2`,
        [message_id, conversation_id]
      );

      const timeDiff =
        Date.now() - isFirstMessage.rows[0].last_message_time * 1000;
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (
        isFirstMessage.rows[0].responses == 0 ||
        isFirstMessage.rows[0].all_messages == 1 ||
        hoursDiff >= 24
      ) {
        const flowAuto = await client.query(
          `SELECT template_data FROM public.auto_flow WHERE backup = $1 AND source = $2 AND company_id = $3 AND company_phone_id = $4`,
          [0, "client-message", company_id, company_phone_id]
        );

        if (flowAuto.rows.length) {
          const hash = crypto
            .createHash("md5")
            .update(
              [
                flowAuto.rows[0].template_data,
                company_id,
                conversation_id,
                formattedDate,
                company_phone_id,
              ].join("")
            )
            .digest("hex");
          await this.QueueModel.createJobToProcess(
            flowAuto.rows[0].template_data,
            company_id,
            conversation_id,
            hash
          );
        } else {
          console.log("First message template not found in Queue");
        }
      } else {
        const lastMessage = await client.query(
          `SELECT m.message_type, m.context_message_id FROM messages m WHERE m.id = $1`,
          [message_id]
        );

        let where = `(m.status = 'read' OR m.status = 'delivered') AND m.conversation_id = ${conversation_id} AND m.message_type = 'template'`;

        if (!!lastMessage.rows[0].context_message_id) {
          where = `m.message_id = '${lastMessage.rows[0].context_message_id}' AND m.message_type = 'template'`;
        }
        const lastMessageFromBot = await client.query(
          `SELECT m.id, t."name", m.message_id FROM messages m JOIN templates_messages tm ON m.id = tm.message_id JOIN templates t ON tm.template_id = t.id WHERE ${where} ORDER BY m.id DESC LIMIT 1`
        );

        if (lastMessageFromBot.rows.length) {
          let messageResponse = null;
          let flowAuto = null;
          switch (lastMessage.rows[0].message_type) {
            case "button":
              messageResponse = await client.query(
                `SELECT payload FROM public.button_messages WHERE message_id = $1`,
                [message_id]
              );

              flowAuto = await client.query(
                `SELECT template_data, source_handle, target FROM public.auto_flow WHERE backup = $1 AND source = $2 AND company_id = $3 AND source_handle = $4 AND company_phone_id = $5`,
                [
                  0,
                  lastMessageFromBot.rows[0].name,
                  company_id,
                  messageResponse.rows[0].payload.replace(/\s/g, ""),
                  company_phone_id,
                ]
              );

              if (flowAuto.rows.length) {
                const hash = crypto
                  .createHash("md5")
                  .update(
                    [
                      0,
                      lastMessageFromBot.rows[0].name,
                      company_id,
                      messageResponse.rows[0].payload.replace(/\s/g, ""),
                      conversation_id,
                      formattedDate,
                      company_phone_id,
                    ].join("")
                  )
                  .digest("hex");
                await this.QueueModel.createJobToProcess(
                  flowAuto.rows[0].template_data,
                  company_id,
                  conversation_id,
                  hash
                );
              } else {
                console.log("Error: message template not found in Queue");
              }
              break;

            case "text":
            case "image":
              flowAuto = await client.query(
                `SELECT template_data FROM public.auto_flow WHERE backup = $1 AND source = $2 AND company_id = $3 AND source_handle = $4 AND company_phone_id = $5`,
                [
                  0,
                  lastMessageFromBot.rows[0].name,
                  company_id,
                  "manually",
                  company_phone_id,
                ]
              );

              if (flowAuto.rows.length) {
                const hash = crypto
                  .createHash("md5")
                  .update(
                    [
                      0,
                      lastMessageFromBot.rows[0].name,
                      company_id,
                      "manually",
                      conversation_id,
                      formattedDate,
                      company_phone_id,
                    ].join("")
                  )
                  .digest("hex");
                await this.QueueModel.createJobToProcess(
                  flowAuto.rows[0].template_data,
                  company_id,
                  conversation_id,
                  hash
                );
              } else {
                console.log("Message template not found in Queue");
              }
              break;
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      client.release();
    }
  }
}
