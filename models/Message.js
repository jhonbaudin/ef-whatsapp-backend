export class MessageModel {
  constructor(pool) {
    this.pool = pool;
  }

  async sendMessage(conversationId, sender, receiver, content) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "INSERT INTO messages (conversation_id, sender, receiver, content) VALUES ($1, $2, $3, $4) RETURNING *",
        [conversationId, sender, receiver, content]
      );
      const message = result.rows[0];
      return message;
    } catch (error) {
      throw new Error("Error sending message");
    } finally {
      client.release();
    }
  }

  async getMessagesByConversation(conversationId) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "SELECT * FROM messages WHERE conversation_id = $1",
        [conversationId]
      );
      const messages = result.rows;
      return messages;
    } catch (error) {
      throw new Error("Error retrieving messages by conversation");
    } finally {
      client.release();
    }
  }
}
