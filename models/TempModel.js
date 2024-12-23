import { ConversationModel } from "./ConversationModel.js";

export class TempModel {
  constructor(pool) {
    this.pool = pool;
    this.conversationModel = new ConversationModel(pool);
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
      await client.release(true);
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
      console.log(error);
      throw new Error("Error running cron");
    } finally {
      await client.release(true);
    }
  }

  async processScheduledTasks() {
    try {
      const client = await this.pool.connect();
      const res = await client.query(`
        SELECT * FROM scheduled_tasks
        WHERE processed = false AND error = false AND (dispatch_date IS NULL OR dispatch_date <= NOW())
      `);

      for (const task of res.rows) {
        try {
          if (task.conversations) {
            for (const id of task.conversations) {
              await this.conversationModel.assignTagToConversation(
                id,
                task.tag,
                1 // task.company_phone_id
              );
            }
          } else if (task.phones) {
            for (const phone of task.phones) {
              const cleanNumber = phone.replace(/\D/g, "");
              const numberWithoutCountryCode = cleanNumber.startsWith("51")
                ? cleanNumber.slice(2)
                : cleanNumber;

              const formattedNumber = `51${numberWithoutCountryCode}`;
              const isPeruvianNumber = /^51\d{9}$/.test(formattedNumber);

              if (isPeruvianNumber) {
                let conversation =
                  await this.conversationModel.createConversation(
                    1,
                    formattedNumber,
                    task.company_phone_id,
                    null,
                    task.user_id
                  );
                if (conversation && conversation.id) {
                  await this.conversationModel.assignTagToConversation(
                    conversation.id,
                    task.tag,
                    1 //task.company_phone_id
                  );
                }
              }
            }
          }

          await client.query(
            `
              UPDATE scheduled_tasks
              SET processed = true
              WHERE id = $1
            `,
            [task.id]
          );
        } catch (error) {
          await client.query(
            `
              UPDATE scheduled_tasks
              SET error = true, error_detail = $2
              WHERE id = $1
            `,
            [task.id, error]
          );
        }
      }

      await client.release(true);
    } catch (error) {
      console.error("Error processing scheduled tasks:", error);
    }
  }
}
