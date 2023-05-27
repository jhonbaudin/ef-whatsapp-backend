import { Pool, QueryResult } from "pg";

export interface Message {
  id: number;
  conversationId: number;
  sender: string;
  receiver: string;
  content: string;
}

export class MessageModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async sendMessage(
    conversationId: number,
    sender: string,
    receiver: string,
    content: string
  ): Promise<Message> {
    const client = await this.pool.connect();

    try {
      const result: QueryResult = await client.query(
        "INSERT INTO messages (conversation_id, sender, receiver, content) VALUES ($1, $2, $3, $4) RETURNING *",
        [conversationId, sender, receiver, content]
      );
      const message: Message = result.rows[0];
      return message;
    } catch (error) {
      throw new Error("Error sending message");
    } finally {
      client.release();
    }
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    const client = await this.pool.connect();

    try {
      const result: QueryResult = await client.query(
        "SELECT * FROM messages WHERE conversation_id = $1",
        [conversationId]
      );
      const messages: Message[] = result.rows;
      return messages;
    } catch (error) {
      throw new Error("Error retrieving messages by conversation");
    } finally {
      client.release();
    }
  }
}
