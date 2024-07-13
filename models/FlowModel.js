import { QueueModel } from "./QueueModel.js";
import crypto from "crypto";

export class FlowModel {
  constructor(pool) {
    this.pool = pool;
    this.QueueModel = new QueueModel(this.pool);
  }

  async createUpdateFlow(flow = [], company_id, company_phone_id) {
    const client = await this.pool.connect();
    try {
      if (!flow.length || null == flow[0].flow_id) {
        throw new Error("No flow id given");
      }
      await client.query("BEGIN");
      await client.query(
        "UPDATE public.auto_flow SET backup = backup + 1 WHERE company_phone_id = $1 AND flow_id = $2",
        [company_phone_id, flow[0].flow_id]
      );
      await client.query(
        "DELETE FROM public.auto_flow WHERE backup > 1 AND company_phone_id = $1 AND flow_id = $2",
        [company_phone_id, flow[0].flow_id]
      );
      const insertPromises = flow.map(async (f) => {
        await client.query(
          `INSERT INTO public.auto_flow ("source", source_handle, target, target_handle, id_relation, backup, company_id, template_data, company_phone_id, node, flow_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
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
            f.node,
            f.flow_id,
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
      await client.release(true);
    }
  }

  async getFlows(company_id, company_phone_id) {
    const client = await this.pool.connect();
    try {
      const queryResult = await client.query(
        `SELECT "source", source_handle AS "sourceHandle", target, target_handle AS "targetHandle", id_relation AS "id", template_data, node, flow_id
        FROM public.auto_flow 
        WHERE company_id = $1 AND company_phone_id = $2 AND backup = $3
        ORDER BY id`,
        [company_id, company_phone_id, 0]
      );
      return queryResult.rows;
    } catch (error) {
      throw new Error("Error fetching flows");
    } finally {
      await client.release(true);
    }
  }

  async getFlowsGrouped(company_id, company_phone_id, flow_id) {
    const client = await this.pool.connect();
    try {
      const queryResult = await client.query(
        `SELECT "source", source_handle AS "sourceHandle", target, target_handle AS "targetHandle", id_relation AS "id", template_data, node, flow_id
        FROM public.auto_flow 
        WHERE company_id = $1 AND company_phone_id = $2 AND backup = $3 AND flow_id = $4
        ORDER BY id`,
        [company_id, company_phone_id, 0, flow_id]
      );
      return queryResult.rows;
    } catch (error) {
      throw new Error("Error fetching flows");
    } finally {
      await client.release(true);
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

      const getLastMessageText = await client.query(
        `SELECT body FROM public.text_messages WHERE message_id = $1`,
        [message_id]
      );
      if (getLastMessageText.rows.length) {
        const getCoincidences = await client.query(
          `SELECT
              "messageData"                
            FROM
              quick_answer
            WHERE
              EXISTS (
                SELECT
                  1
                FROM
                  jsonb_array_elements_text(coincidences) AS elemento
                WHERE
                  LOWER('${getLastMessageText.rows[0].body}') LIKE LOWER('%' || elemento || '%')
              )
              AND company_phone_id = $1
              AND company_id = $2 LIMIT 1`,
          [company_phone_id, company_id]
        );
        if (getCoincidences.rows.length) {
          const hash = crypto
            .createHash("md5")
            .update(
              [
                getLastMessageText.rows[0].body,
                getCoincidences.rows[0].messageData,
                company_id,
                conversation_id,
                formattedDate,
                company_phone_id,
              ].join("")
            )
            .digest("hex");

          await this.QueueModel.createJobToProcess(
            getCoincidences.rows[0].messageData,
            company_id,
            conversation_id,
            hash
          );
          return;
        }
      }

      if (
        isFirstMessage.rows[0].responses == 0 ||
        isFirstMessage.rows[0].all_messages == 1 ||
        hoursDiff >= 24
      ) {
        const flowAuto = await client.query(
          `SELECT id, template_data FROM public.auto_flow WHERE backup = $1 AND source = $2 AND company_id = $3 AND company_phone_id = $4`,
          [0, "client-message", company_id, company_phone_id]
        );

        (async () => {
          for (const row of flowAuto.rows) {
            const { id, template_data } = row;

            const hash = crypto
              .createHash("md5")
              .update(
                [
                  id,
                  template_data,
                  company_id,
                  conversation_id,
                  formattedDate,
                  company_phone_id,
                ].join("")
              )
              .digest("hex");

            await this.QueueModel.createJobToProcess(
              template_data,
              company_id,
              conversation_id,
              hash
            );
          }
        })();
      } else {
        const lastMessage = await client.query(
          `SELECT m.message_type, m.context_message_id FROM messages m WHERE m.id = $1`,
          [message_id]
        );

        let where = `(m.status = 'read' OR m.status = 'delivered' or m.status = 'trying') AND m.conversation_id = ${conversation_id}`;

        if (!!lastMessage.rows[0].context_message_id) {
          where = `m.message_id = '${lastMessage.rows[0].context_message_id}'`;
        }
        const lastMessageFromBot = await client.query(
          `SELECT m.id, CASE WHEN t."name" IS NULL THEN (SELECT af.target FROM queue q LEFT JOIN auto_flow af ON af.template_data = q.message::jsonb AND af.backup = 0 WHERE q.conversation_id = m.conversation_id ORDER BY q.id DESC LIMIT 1) ELSE t."name" END AS name, m.message_id FROM messages m LEFT JOIN templates_messages tm ON m.id = tm.message_id LEFT JOIN templates t ON tm.template_id = t.id WHERE ${where} ORDER BY m.id DESC LIMIT 1`
        );

        if (lastMessageFromBot.rows.length && lastMessageFromBot.rows[0].name) {
          if (
            !!lastMessage.rows[0].context_message_id &&
            lastMessageFromBot.rows[0].status == "trying"
          ) {
            await client.query(
              "UPDATE public.messages SET status = 'read' WHERE id = $1",
              [lastMessageFromBot.rows[0].id]
            );
          }

          let messageResponse = null;
          let flowAuto = null;
          switch (lastMessage.rows[0].message_type) {
            case "button":
              messageResponse = await client.query(
                `SELECT payload FROM public.button_messages WHERE message_id = $1`,
                [message_id]
              );

              flowAuto = await client.query(
                `SELECT max(id) as id, template_data, source_handle, target FROM public.auto_flow WHERE backup = $1 AND source = $2 AND company_id = $3 AND source_handle = $4 AND company_phone_id = $5 GROUP BY template_data,source_handle,target`,
                [
                  0,
                  lastMessageFromBot.rows[0].name,
                  company_id,
                  messageResponse.rows[0].payload.replace(/\s/g, ""),
                  company_phone_id,
                ]
              );

              (async () => {
                for (const row of flowAuto.rows) {
                  const { id, template_data } = row;

                  const hash = crypto
                    .createHash("md5")
                    .update(
                      [
                        id,
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
                    template_data,
                    company_id,
                    conversation_id,
                    hash
                  );
                }
              })();
              break;
            case "text":
            case "image":
            case "video":
              flowAuto = await client.query(
                `SELECT max(id) as id, template_data FROM public.auto_flow WHERE backup = $1 AND source = $2 AND company_id = $3 AND source_handle = $4 AND company_phone_id = $5 GROUP BY template_data`,
                [
                  0,
                  lastMessageFromBot.rows[0].name,
                  company_id,
                  "manually",
                  company_phone_id,
                ]
              );

              (async () => {
                for (const row of flowAuto.rows) {
                  const { id, template_data } = row;

                  const hash = crypto
                    .createHash("md5")
                    .update(
                      [
                        id,
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
                    template_data,
                    company_id,
                    conversation_id,
                    hash
                  );
                }
              })();
              break;
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      await client.release(true);
    }
  }
}
