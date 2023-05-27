import { Pool, QueryResult } from "pg";

export interface Conversation {
  id: number;
  name: string;
}

export interface Message {
  id: number;
  conversationId: number;
  sender: string;
  receiver: string;
  content: string;
}

export class ConversationModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async createConversation(name: string): Promise<Conversation> {
    const client = await this.pool.connect();

    try {
      const result: QueryResult = await client.query(
        "INSERT INTO conversations (name) VALUES ($1) RETURNING *",
        [name]
      );
      const conversation: Conversation = result.rows[0];
      return conversation;
    } catch (error) {
      throw new Error("Error creating conversation");
    } finally {
      client.release();
    }
  }

  async getConversationById(id: number): Promise<Conversation | null> {
    const client = await this.pool.connect();

    try {
      const result: QueryResult = await client.query(
        "SELECT * FROM conversations WHERE id = $1",
        [id]
      );
      const conversation: Conversation | null = result.rows[0];
      return conversation || null;
    } catch (error) {
      throw new Error("Error retrieving conversation by ID");
    } finally {
      client.release();
    }
  }

  async createMessage(
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
      throw new Error("Error creating message");
    } finally {
      client.release();
    }
  }

  async getMessagesByConversationWithPagination(
    conversationId: number,
    offset: number,
    limit: number
  ): Promise<Message[]> {
    const client = await this.pool.connect();

    try {
      const result: QueryResult = await client.query(
        "SELECT * FROM messages WHERE conversation_id = $1 OFFSET $2 LIMIT $3",
        [conversationId, offset, limit]
      );
      const messages: Message[] = result.rows;
      return messages;
    } catch (error) {
      throw new Error("Error retrieving paginated messages by conversation");
    } finally {
      client.release();
    }
  }
}
