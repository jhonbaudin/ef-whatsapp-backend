export class MessageModel {
  constructor(pool) {
    this.pool = pool;
  }

  async createMessage(conversationId, sender, receiver, content) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "INSERT INTO messages (conversation_id, sender, receiver, content) VALUES ($1, $2, $3, $4) RETURNING *",
        [conversationId, sender, receiver, content]
      );
      const message = result.rows[0];
      return message;
    } catch (error) {
      throw new Error("Error creating message");
    } finally {
      client.release();
    }
  }

  async getMessage(messageId) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "SELECT * FROM messages WHERE id = $1",
        [messageId]
      );
      const message = result.rows[0];
      return message;
    } catch (error) {
      throw new Error("Error retrieving message");
    } finally {
      client.release();
    }
  }

  async updateMessage(messageId, content) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "UPDATE messages SET content = $1 WHERE id = $2 RETURNING *",
        [content, messageId]
      );
      const message = result.rows[0];
      return message;
    } catch (error) {
      throw new Error("Error updating message");
    } finally {
      client.release();
    }
  }

  async deleteMessage(messageId) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "DELETE FROM messages WHERE id = $1 RETURNING *",
        [messageId]
      );
      const message = result.rows[0];
      return message;
    } catch (error) {
      throw new Error("Error deleting message");
    } finally {
      client.release();
    }
  }
}
