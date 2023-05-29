import dotenv from "dotenv";
import { MessageController } from "../thirdParty/whatsappCloudAPI/messageController.js";
import { MediaController } from "../thirdParty/whatsappCloudAPI/mediaController.js";

dotenv.config();

export class ConversationModel {
  constructor(pool) {
    this.pool = pool;
    this.messageController = new MessageController();
    this.mediaController = new MediaController();
  }

  async createConversation(wa_id, wa_id_consignado) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "INSERT INTO conversations (wa_id, wa_id_consignado) VALUES ($1, $2) RETURNING *",
        [wa_id, wa_id_consignado]
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
        SELECT c.id, c.wa_id, c.wa_id_consignado, c.created_at, m.body AS last_message, m.message_type, m.status
        FROM conversations c
        LEFT JOIN (
          SELECT m.conversation_id, tm.body, m.message_type, m.created_at, m.status,
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
        SELECT m.id, m.conversation_id, m.message_type, m.created_at, m.message_id AS id_whatsapp, m.status,
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
        WHERE m.conversation_id = $1
        ORDER BY m.id, m.created_at DESC
        LIMIT $2 OFFSET $3;
      `,
        [conversationId, limit, offset]
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
      console.log(error);
      throw new Error("Error fetching messages");
    } finally {
      client.release();
    }
  }

  async createMessage(conversationId, receiver, messageData) {
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
        default:
          throw new Error(`Tipo de mensaje no válido: ${messageData.type}`);
      }

      const apiResponse = await this.sendMessageAPI(messageData, receiver);

      const messageIdFromAPI = apiResponse.messages[0].id;

      this.updateMessageId(client, messageId, messageIdFromAPI);

      return messageId;
    } catch (error) {
      throw error;
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
    console.log();

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
      default:
        throw new Error(`Tipo de mensaje no válido: ${messageData.type}`);
    }

    return await this.messageController.sendMessageRequest(requestBody);
  }

  formatMessage(data) {
    const formatMessage = {};
    formatMessage.id = data.id;
    formatMessage.conversation_id = data.conversation_id;
    formatMessage.message_type = data.message_type;
    formatMessage.status = data.status;
    formatMessage.body = data.body;
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
