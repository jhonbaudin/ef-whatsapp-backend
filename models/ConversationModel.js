export class ConversationModel {
  constructor(pool) {
    this.pool = pool;
  }

  async createConversation(name) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "INSERT INTO conversations (name) VALUES ($1) RETURNING *",
        [name]
      );
      const conversation = result.rows[0];
      return conversation;
    } catch (error) {
      throw new Error("Error creating conversation");
    } finally {
      client.release();
    }
  }

  async getConversationById(id) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "SELECT * FROM conversations WHERE id = $1",
        [id]
      );
      const conversation = result.rows[0];
      return conversation || null;
    } catch (error) {
      throw new Error("Error retrieving conversation by ID");
    } finally {
      client.release();
    }
  }

  async getMessagesByConversationWithPagination(conversationId, offset, limit) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "SELECT * FROM messages WHERE conversation_id = $1 OFFSET $2 LIMIT $3",
        [conversationId, offset, limit]
      );
      const messages = result.rows;
      return messages;
    } catch (error) {
      throw new Error("Error retrieving paginated messages by conversation");
    } finally {
      client.release();
    }
  }
}
