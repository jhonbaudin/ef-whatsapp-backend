export class ConversationModel {
  constructor(pool) {
    this.pool = pool;
  }

  async createConversation(wa_id) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "INSERT INTO conversations (wa_id) VALUES ($1) RETURNING *",
        [wa_id]
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
        `SELECT c.id, c.wa_id, c.created_at, m.body AS last_message, m.message_type
        FROM conversations c
        LEFT JOIN (
          SELECT m.conversation_id, tm.body, m.message_type,m.created_at,
                ROW_NUMBER() OVER (PARTITION BY m.conversation_id ORDER BY m.created_at DESC) AS rn
          FROM messages m
          LEFT JOIN text_messages tm ON tm.message_id = m.id
          ORDER BY m.created_at DESC
        ) m ON c.id = m.conversation_id AND m.rn = 1
        WHERE c.id = $1`,
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

  async getAllConversationsWithLastMessage(limit, offset) {
    const client = await this.pool.connect();

    try {
      const conversations = await client.query(
        `
        SELECT c.id, c.wa_id, c.wa_id_consignado, c.created_at, m.body AS last_message, m.message_type, m.source
        FROM conversations c
        LEFT JOIN (
          SELECT m.conversation_id, tm.body, m.message_type, m.created_at, m.source,
                ROW_NUMBER() OVER (PARTITION BY m.conversation_id ORDER BY m.created_at DESC) AS rn
          FROM messages m
          LEFT JOIN text_messages tm ON tm.message_id = m.id
          ORDER BY m.created_at DESC
        ) m ON c.id = m.conversation_id AND m.rn = 1
        ORDER BY c.created_at DESC
        LIMIT $1 OFFSET $2;
      `,
        [limit, offset]
      );

      return conversations.rows;
    } catch (error) {
      throw new Error("Error fetching conversations");
    } finally {
      client.release();
    }
  }

  async getMessagesByConversationWithPagination(conversationId, offset, limit) {
    const client = await this.pool.connect();

    try {
      const messages = await client.query(
        `
        SELECT m.id, m.conversation_id, m.message_type, m.created_at, m.message_id AS id_whatsapp, m.source,
          t.body AS text_message, t.id AS text_message_id, r.id AS reaction_message_id,
          r.emoji AS reaction_message_emoji, r.reacted_message_id AS reaction_message_reacted_message_id,
          v.id AS video_message_id, v.sha256 AS video_message_sha256, v.mime_type AS video_message_mime_type,
          s.id AS sticker_message_id, s.sha256 AS sticker_message_sha256, s.animated AS sticker_message_animated, s.mime_type AS sticker_message_mime_type,
          a.id AS audio_message_id, a.voice AS audio_message_voice, a.sha256 AS audio_message_sha256, a.mime_type AS audio_message_mime_type,
          i.id AS image_message_id, i.sha256 AS image_message_sha256, i.mime_type AS image_message_mime_type,
          l.latitude AS location_message_latitude, l.longitude AS location_message_longitude,
          d.id AS document_message_id, d.sha256 AS document_message_sha256, d.filename AS document_message_filename, d.mime_type AS document_message_mime_type,
          u.message_data AS unknown_message
        FROM messages m
        LEFT JOIN text_messages t ON t.message_id = m.id
        LEFT JOIN reaction_messages r ON r.message_id = m.id
        LEFT JOIN video_messages v ON v.message_id = m.id
        LEFT JOIN sticker_messages s ON s.message_id = m.id
        LEFT JOIN audio_messages a ON a.message_id = m.id
        LEFT JOIN image_messages i ON i.message_id = m.id
        LEFT JOIN location_messages l ON l.message_id = m.id
        LEFT JOIN document_messages d ON d.message_id = m.id
        LEFT JOIN unknown_messages u ON u.message_id = m.id
        WHERE m.conversation_id = $1
        ORDER BY m.id, m.created_at DESC
        LIMIT $2 OFFSET $3;
      `,
        [conversationId, limit, offset]
      );

      return messages.rows.map((message) => new Message(message));
    } catch (error) {
      console.log(error);
      throw new Error("Error fetching messages");
    } finally {
      client.release();
    }
  }
}

class Message {
  constructor(data) {
    this.id = data.id;
    this.conversation_id = data.conversation_id;
    this.message_type = data.message_type;
    this.source = data.source;
    this.body = data.body;
    if (data.message_type == "text") {
      this.message = {
        id: data.text_message_id,
        body: data.text_message,
        id_whatsapp: data.id_whatsapp,
      };
    }
    if (data.message_type == "reaction") {
      this.message = {
        id: data.reaction_message_id,
        emoji: data.reaction_message_emoji,
        reacted_message_id: data.reaction_message_reacted_message_id,
        id_whatsapp: data.id_whatsapp,
      };
    }
    if (data.message_type == "video") {
      this.message = {
        id: data.video_message_id,
        sha256: data.video_message_sha256,
        mime_type: data.video_message_mime_type,
        id_whatsapp: data.id_whatsapp,
      };
    }
    if (data.message_type == "sticker") {
      this.message = {
        id: data.sticker_message_id,
        sha256: data.sticker_message_sha256,
        animated: data.sticker_message_animated,
        mime_type: data.sticker_message_mime_type,
        id_whatsapp: data.id_whatsapp,
      };
    }
    if (data.message_type == "audio") {
      this.message = {
        id: data.audio_message_id,
        voice: data.audio_message_voice,
        sha256: data.audio_message_sha256,
        mime_type: data.audio_message_mime_type,
        id_whatsapp: data.id_whatsapp,
      };
    }
    if (data.message_type == "image") {
      this.message = {
        id: data.image_message_id,
        sha256: data.image_message_sha256,
        mime_type: data.image_message_mime_type,
        id_whatsapp: data.id_whatsapp,
      };
    }
    if (data.message_type == "location") {
      this.message = {
        latitude: data.location_message_latitude,
        longitude: data.location_message_longitude,
        id_whatsapp: data.id_whatsapp,
      };
    }
    if (data.message_type == "document") {
      this.message = {
        id: data.document_message_id,
        sha256: data.document_message_sha256,
        filename: data.document_message_filename,
        mime_type: data.document_message_mime_type,
        id_whatsapp: data.id_whatsapp,
      };
    }
    if (data.message_type == "unknown") {
      this.unknown_message = data.unknown_message;
    }
    this.created_at = data.created_at;
  }
}
