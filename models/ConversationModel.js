import dotenv from "dotenv";
import { MessageController } from "../thirdParty/whatsappCloudAPI/messageController.js";
import { MediaController } from "../thirdParty/whatsappCloudAPI/mediaController.js";
import { ContactModel } from "./ContactModel.js";

dotenv.config();

export class ConversationModel {
  constructor(pool) {
    this.pool = pool;
    this.messageController = new MessageController();
    this.mediaController = new MediaController();
    this.contactModel = new ContactModel(this.pool);
  }

  async createConversation(company_id, to) {
    const client = await this.pool.connect();
    try {
      let contact = await client.query(
        "SELECT c.id FROM public.contacts c WHERE c.phone = $1 AND c.company_id = $2 LIMIT 1",
        [to, company_id]
      );

      if (!contact.rows.length) {
        contact = await client.query(
          "INSERT INTO public.contacts (phone, company_id, type) VALUES ($1, $2, $3) RETURNING id",
          [to, company_id, "client"]
        );
      }

      const result = await client.query(
        "INSERT INTO conversations (contact_id, company_id) VALUES ($1, $2) RETURNING *",
        [contact.rows[0].id, company_id]
      );
      const conversation = result.rows[0];
      return conversation;
    } catch (error) {
      throw new Error("Error creating conversation");
    } finally {
      client.release();
    }
  }

  async markAsReadMessage(ids, company_id) {
    const client = await this.pool.connect();

    try {
      await client.query(
        `UPDATE messages m
        SET read = true 
        FROM conversations c
        WHERE m.conversation_id = c.id
        AND m.id IN (${ids}) and c.company_id = ${company_id}`
      );
      return true;
    } catch (error) {
      throw new Error("Error marking as read");
    } finally {
      client.release();
    }
  }

  async getAllConversationsWithLastMessage(limit, offset, company_id) {
    const client = await this.pool.connect();

    try {
      const conversations = await client.query(
        `
        SELECT c.id, c.last_message_time, m.body AS last_message, m.message_type, m.status,
        m.message_created_at, c.contact_id,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND "read" = false) AS unread_count
        FROM conversations c
        LEFT JOIN (
          SELECT m.conversation_id, COALESCE(tm.body, rm.emoji) as body, m.message_type, m.created_at as message_created_at, m.status,
                ROW_NUMBER() OVER (PARTITION BY m.conversation_id ORDER BY m.created_at DESC) AS rn
          FROM messages m
          LEFT JOIN text_messages tm ON tm.message_id = m.id
          LEFT JOIN reaction_messages rm ON rm.message_id = m.id
          ORDER BY m.created_at DESC
        ) m ON c.id = m.conversation_id AND m.rn = 1
        WHERE c.company_id = $3
        ORDER BY m.message_created_at DESC
        LIMIT $1 OFFSET $2;
      `,
        [limit, offset, company_id]
      );

      const response = await Promise.all(
        conversations.rows.map(async (conv) => {
          conv.contact = await this.contactModel.getContactById(
            conv.contact_id,
            company_id
          );
          return conv;
        })
      );

      return response;
    } catch (error) {
      throw new Error("Error fetching conversations");
    } finally {
      client.release();
    }
  }

  async getConversationByIdWithLastMessage(conversationId) {
    const client = await this.pool.connect();

    try {
      const conversations = await client.query(
        `
        SELECT c.id, c.last_message_time, m.body AS last_message, m.message_type, m.status,
        m.message_created_at, c.contact_id, c.company_id,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND "read" = false) AS unread_count
        FROM conversations c
        LEFT JOIN (
          SELECT m.conversation_id, COALESCE(tm.body, rm.emoji) as body, m.message_type, m.created_at as message_created_at, m.status,
                ROW_NUMBER() OVER (PARTITION BY m.conversation_id ORDER BY m.created_at DESC) AS rn
          FROM messages m
          LEFT JOIN text_messages tm ON tm.message_id = m.id
          LEFT JOIN reaction_messages rm ON rm.message_id = m.id
          ORDER BY m.created_at DESC
        ) m ON c.id = m.conversation_id AND m.rn = 1
        LEFT JOIN contacts c2 ON c2.id = c.contact_id AND c2."type" = 'client'
        WHERE c.id = $1 LIMIT 1;
      `,
        [conversationId]
      );

      conversations.rows[0].contact = await this.contactModel.getContactById(
        conversations.rows[0].contact_id,
        conversations.rows[0].company_id
      );

      return conversations.rows[0];
    } catch (error) {
      console.log(error);
      throw new Error("Error fetching conversations");
    } finally {
      client.release();
    }
  }

  async getConversationById(conversationId, company_id) {
    const client = await this.pool.connect();

    try {
      const conversations = await client.query(
        `
        SELECT c.id, c.last_message_time,c.company_id, c.contact_id, c.origin, m.id AS last_message_id
        FROM conversations c
        LEFT JOIN messages m ON m.conversation_id = c.id 
        WHERE c.id = $1 AND c.company_id = $2 ORDER BY m.id DESC LIMIT 1`,
        [conversationId, company_id]
      );

      return conversations.rows[0];
    } catch (error) {
      throw new Error("Error fetching conversation");
    } finally {
      client.release();
    }
  }

  async getMessagesByConversationWithPagination(
    conversationId,
    offset,
    limit,
    company_id
  ) {
    const client = await this.pool.connect();

    try {
      const messages = await client.query(
        `
        SELECT m.id, m.conversation_id, m.message_type, m.created_at, m.message_id AS id_whatsapp, m.status, m."read",
          t.body AS text_message, t.id AS text_message_id, r.id AS reaction_message_id,
          r.emoji AS reaction_message_emoji, r.reacted_message_id AS reaction_message_reacted_message_id,
          v.id AS video_message_id, v.sha256 AS video_message_sha256, v.mime_type AS video_message_mime_type,
          v.video_id as video_media_id, s.id AS sticker_message_id, s.sha256 AS sticker_message_sha256,
          s.animated AS sticker_message_animated, s.mime_type AS sticker_message_mime_type, s.sticker_id as sticker_media_id,
          a.id AS audio_message_id, a.voice AS audio_message_voice, a.sha256 AS audio_message_sha256, a.mime_type AS audio_message_mime_type,
          a.audio_id as audio_media_id, i.id AS image_message_id, i.sha256 AS image_message_sha256, i.mime_type AS image_message_mime_type,
          i.image_id as image_media_id, l.latitude AS location_message_latitude, l.longitude AS location_message_longitude,
          d.id AS document_message_id, d.sha256 AS document_message_sha256, d.filename AS document_message_filename,
          d.mime_type AS document_message_mime_type, d.document_id as document_media_id, m2.url, m2.file_size 
        FROM messages m
        LEFT JOIN text_messages t ON t.message_id = m.id
        LEFT JOIN reaction_messages r ON r.message_id = m.id
        LEFT JOIN video_messages v ON v.message_id = m.id
        LEFT JOIN sticker_messages s ON s.message_id = m.id
        LEFT JOIN audio_messages a ON a.message_id = m.id
        LEFT JOIN image_messages i ON i.message_id = m.id
        LEFT JOIN location_messages l ON l.message_id = m.id
        LEFT JOIN document_messages d ON d.message_id = m.id
        LEFT JOIN media m2 ON m2.message_id = m.id
        LEFT JOIN conversations c ON c.id = m.conversation_id
        WHERE c.id = $1
        AND c.company_id = $4
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3`,
        [conversationId, limit, offset, company_id]
      );
      return Promise.all(
        messages.rows.map(async (message) => {
          const formatMessage = this.formatMessage(message);
          if (
            ["document", "image", "audio", "video", "sticker"].includes(
              formatMessage.message_type
            ) &&
            formatMessage.message.url == null
          ) {
            const media = await this.mediaController.getMedia(
              formatMessage.message.media_id
            );
            formatMessage.message.url = media.url;
            formatMessage.message.file_size = media.file_size;
          }

          return formatMessage;
        })
      );
    } catch (error) {
      throw new Error("Error fetching messages");
    } finally {
      client.release();
    }
  }

  async getMessagesById(messageId) {
    const client = await this.pool.connect();

    try {
      const messages = await client.query(
        `
        SELECT m.id, m.conversation_id, m.message_type, m.created_at, m.message_id AS id_whatsapp, m.status, m."read",
          t.body AS text_message, t.id AS text_message_id, r.id AS reaction_message_id,
          r.emoji AS reaction_message_emoji, r.reacted_message_id AS reaction_message_reacted_message_id,
          v.id AS video_message_id, v.sha256 AS video_message_sha256, v.mime_type AS video_message_mime_type,
          v.video_id as video_media_id, s.id AS sticker_message_id, s.sha256 AS sticker_message_sha256,
          s.animated AS sticker_message_animated, s.mime_type AS sticker_message_mime_type, s.sticker_id as sticker_media_id,
          a.id AS audio_message_id, a.voice AS audio_message_voice, a.sha256 AS audio_message_sha256, a.mime_type AS audio_message_mime_type,
          a.audio_id as audio_media_id, i.id AS image_message_id, i.sha256 AS image_message_sha256, i.mime_type AS image_message_mime_type,
          i.image_id as image_media_id, l.latitude AS location_message_latitude, l.longitude AS location_message_longitude,
          d.id AS document_message_id, d.sha256 AS document_message_sha256, d.filename AS document_message_filename,
          d.mime_type AS document_message_mime_type, d.document_id as document_media_id, m2.url, m2.file_size 
        FROM messages m
        LEFT JOIN text_messages t ON t.message_id = m.id
        LEFT JOIN reaction_messages r ON r.message_id = m.id
        LEFT JOIN video_messages v ON v.message_id = m.id
        LEFT JOIN sticker_messages s ON s.message_id = m.id
        LEFT JOIN audio_messages a ON a.message_id = m.id
        LEFT JOIN image_messages i ON i.message_id = m.id
        LEFT JOIN location_messages l ON l.message_id = m.id
        LEFT JOIN document_messages d ON d.message_id = m.id
        LEFT JOIN media m2 ON m2.message_id = m.id 
        WHERE m.id = $1 LIMIT 1
      `,
        [messageId]
      );
      const formatMessage = this.formatMessage(messages.rows[0]);
      if (
        ["document", "image", "audio", "video", "sticker"].includes(
          formatMessage.message_type
        ) &&
        formatMessage.message.url == null
      ) {
        const media = await this.mediaController.getMedia(
          formatMessage.message.media_id
        );
        formatMessage.message.url = media.url;
        formatMessage.message.file_size = media.file_size;
      }

      return formatMessage;
    } catch (error) {
      throw new Error("Error fetching messages");
    } finally {
      client.release();
    }
  }

  async createMessage(conversationId, messageData, company_id) {
    const client = await this.pool.connect();
    try {
      const messageId = await this.insertMessage(
        client,
        conversationId,
        messageData
      );

      switch (messageData.type) {
        case "text":
          await this.insertMessageData(
            client,
            messageId,
            "text_messages",
            "body",
            [messageData.text.body]
          );
          break;
        case "image":
          await this.insertMessageData(
            client,
            messageId,
            "image_messages",
            "image_url",
            [messageData.imageUrl]
          );
          break;
        case "video":
          await this.insertMessageData(
            client,
            messageId,
            "video_messages",
            "video_url",
            [messageData.videoUrl]
          );
          break;
        case "sticker":
          await this.insertMessageData(
            client,
            messageId,
            "sticker_messages",
            "sticker_url",
            [messageData.stickerUrl]
          );
          break;
        case "audio":
          await this.insertMessageData(
            client,
            messageId,
            "audio_messages",
            "audio_url",
            [messageData.audioUrl]
          );
          break;
        case "location":
          await this.insertMessageData(
            client,
            messageId,
            "location_messages",
            "latitude, longitude",
            [messageData.latitude, messageData.longitude]
          );
          break;
        case "interactive":
        case "template":
          break;
        default:
          throw new Error(`Invalid message type: ${messageData.type}`);
      }

      const conversation = await this.getConversationById(
        conversationId,
        company_id
      );
      const contact = await this.contactModel.getContactById(
        conversation.contact_id,
        company_id
      );

      const apiResponse = await this.sendMessageAPI(messageData, contact.phone);

      const messageIdFromAPI = apiResponse.messages[0].id;

      this.updateMessageId(client, messageId, messageIdFromAPI);

      return messageId;
    } catch (error) {
      throw new Error("Error creating messages");
    } finally {
      client.release();
    }
  }

  async insertMessage(client, conversationId, messageData) {
    const query =
      "INSERT INTO public.messages (message_type, conversation_id, status) VALUES ($1, $2, $3) RETURNING id";
    const values = [messageData.type, conversationId, "trying"];
    const result = await client.query(query, values);
    return result.rows[0].id;
  }

  async insertMessageData(
    client,
    messageId,
    tableName,
    columnNames,
    columnValues
  ) {
    const query = `INSERT INTO public.${tableName} (message_id, ${columnNames}) VALUES ($1, ${columnValues.map(
      (v, k) => "$" + (k + 2)
    )})`;
    const values = [messageId, ...columnValues];
    await client.query(query, values);
  }

  updateMessageId(client, messageId, messageIdFromAPI) {
    const query = "UPDATE public.messages SET message_id = $1 WHERE id = $2";
    const values = [messageIdFromAPI, messageId];
    client.query(query, values);
  }

  async sendMessageAPI(messageData, receiver) {
    const requestBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: messageData.type,
    };

    switch (messageData.type) {
      case "text":
        requestBody.text = messageData.text;
        break;
      case "reaction":
        requestBody.reaction = messageData.reaction;
        break;
      case "image":
        requestBody.image = messageData.image;
        break;
      case "audio":
        requestBody.audio = messageData.audio;
        break;
      case "document":
        requestBody.document = messageData.document;
        break;
      case "sticker":
        requestBody.sticker = messageData.sticker;
        break;
      case "video":
        requestBody.video = messageData.video;
        break;
      case "location":
        requestBody.location = messageData.location;
        break;
      case "interactive":
        requestBody.interactive = messageData.interactive;
      case "template":
        requestBody.template = messageData.template;
        break;
      default:
        throw new Error(`Invalid message type: ${messageData.type}`);
    }

    return await this.messageController.sendMessage(requestBody);
  }

  formatMessage(data) {
    const formatMessage = {};
    formatMessage.id = data.id;
    formatMessage.conversation_id = data.conversation_id;
    formatMessage.message_type = data.message_type;
    formatMessage.status = data.status;
    formatMessage.body = data.body;
    formatMessage.read = data.read;
    if (data.message_type == "text") {
      formatMessage.message = {
        id: data.text_message_id,
        body: data.text_message,
        id_whatsapp: data.id_whatsapp,
      };
    }
    if (data.message_type == "reaction") {
      formatMessage.message = {
        id: data.reaction_message_id,
        emoji: data.reaction_message_emoji,
        reacted_message_id: data.reaction_message_reacted_message_id,
        id_whatsapp: data.id_whatsapp,
      };
    }
    if (data.message_type == "video") {
      formatMessage.message = {
        id: data.video_message_id,
        sha256: data.video_message_sha256,
        mime_type: data.video_message_mime_type,
        id_whatsapp: data.id_whatsapp,
        url: data.url,
        file_size: data.file_size,
        media_id: data.video_media_id,
      };
    }
    if (data.message_type == "sticker") {
      formatMessage.message = {
        id: data.sticker_message_id,
        sha256: data.sticker_message_sha256,
        animated: data.sticker_message_animated,
        mime_type: data.sticker_message_mime_type,
        id_whatsapp: data.id_whatsapp,
        url: data.url,
        file_size: data.file_size,
        media_id: data.sticker_media_id,
      };
    }
    if (data.message_type == "audio") {
      formatMessage.message = {
        id: data.audio_message_id,
        voice: data.audio_message_voice,
        sha256: data.audio_message_sha256,
        mime_type: data.audio_message_mime_type,
        id_whatsapp: data.id_whatsapp,
        url: data.url,
        file_size: data.file_size,
        media_id: data.audio_media_id,
      };
    }
    if (data.message_type == "image") {
      formatMessage.message = {
        id: data.image_message_id,
        sha256: data.image_message_sha256,
        mime_type: data.image_message_mime_type,
        id_whatsapp: data.id_whatsapp,
        url: data.url,
        file_size: data.file_size,
        media_id: data.image_media_id,
      };
    }
    if (data.message_type == "location") {
      formatMessage.message = {
        latitude: data.location_message_latitude,
        longitude: data.location_message_longitude,
        id_whatsapp: data.id_whatsapp,
      };
    }
    if (data.message_type == "document") {
      formatMessage.message = {
        id: data.document_message_id,
        sha256: data.document_message_sha256,
        filename: data.document_message_filename,
        mime_type: data.document_message_mime_type,
        id_whatsapp: data.id_whatsapp,
        url: data.url,
        file_size: data.file_size,
        media_id: data.document_media_id,
      };
    }
    if (data.message_type == "unknown") {
      formatMessage.unknown_message = data.unknown_message;
    }
    formatMessage.created_at = data.created_at;

    return formatMessage;
  }
}
