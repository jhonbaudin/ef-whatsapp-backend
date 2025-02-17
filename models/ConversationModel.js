import dotenv from "dotenv";
import { MessageController } from "../thirdParty/whatsappCloudAPI/messageController.js";
import { MediaController } from "../thirdParty/whatsappCloudAPI/mediaController.js";
import { ContactModel } from "./ContactModel.js";
import { TemplateModel } from "./TemplateModel.js";
import crypto from "crypto";
import { QueueModel } from "./QueueModel.js";

dotenv.config();

export class ConversationModel {
  constructor(pool) {
    this.pool = pool;
    this.messageController = new MessageController();
    this.mediaController = new MediaController();
    this.contactModel = new ContactModel(this.pool);
    this.templateModel = new TemplateModel(this.pool);
    this.templateModel = new TemplateModel(this.pool);
    this.queueModel = new QueueModel(this.pool);
  }

  async createConversation(
    company_id,
    to,
    company_phone_id,
    messageData = null,
    user_id = null
  ) {
    const client = await this.pool.connect();
    try {
      const cleanNumber = to.replace(/\D/g, "");
      // const numberWithoutCountryCode = cleanNumber.startsWith("51")
      //   ? cleanNumber.slice(2)
      //   : cleanNumber;

      // const formattedNumber = `51${numberWithoutCountryCode}`;
      // const isPeruvianNumber = /^51\d{9}$/.test(formattedNumber);

      let contact = await client.query(
        "SELECT c.id, c.phone, c.country, c.email, c.name, c.tag_id FROM public.contacts c WHERE c.phone = $1 AND c.company_id = $2 LIMIT 1",
        [cleanNumber, company_id]
      );

      if (!contact.rows.length) {
        contact = await client.query(
          "INSERT INTO public.contacts (phone, company_id, type, name) VALUES ($1, $2, $3, $1) RETURNING id",
          [cleanNumber, company_id, "client"]
        );
      }

      let conversation = await client.query(
        "SELECT c.id FROM public.conversations c WHERE c.contact_id = $1 AND c.company_id = $2 AND c.company_phone_id = $3 LIMIT 1",
        [contact.rows[0].id, company_id, company_phone_id]
      );

      if (!conversation.rows.length) {
        conversation = await client.query(
          "INSERT INTO conversations (contact_id, company_id, company_phone_id) VALUES ($1, $2, $3) RETURNING *",
          [contact.rows[0].id, company_id, company_phone_id]
        );
      }

      if (!conversation.rows.length) {
        throw new Error("Error creating new conversation");
      }

      if (null !== user_id) {
        await client.query(
          "INSERT INTO public.user_conversation (user_id, conversation_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [user_id, conversation.rows[0].id]
        );
      }

      if (null != messageData) {
        await this.createMessage(
          conversation.rows[0].id,
          messageData,
          company_id
        );
      }

      const response = {
        contact: contact.rows[0],
        id: conversation.rows[0].id,
      };
      return response;
    } catch (error) {
      throw new Error("Error creating conversation");
    } finally {
      await client.release(true);
    }
  }

  async markAsReadMessage(conversation_id, company_id) {
    const client = await this.pool.connect();

    try {
      await client.query(
        `UPDATE messages m
        SET read = true 
        FROM conversations c
        WHERE m.conversation_id = ${conversation_id}
        AND c.company_id = ${company_id}
        AND read = false`
      );

      return true;
    } catch (error) {
      throw new Error("Error marking as read");
    } finally {
      await client.release(true);
    }
  }

  async markAsUnreadMessage(conversation_id, company_id) {
    const client = await this.pool.connect();

    try {
      await client.query(
        `UPDATE messages m
        SET read = false 
        FROM conversations c
        WHERE m.conversation_id = ${conversation_id}
          AND c.company_id = ${company_id}
          AND m.id = (
            SELECT id
            FROM messages
            WHERE conversation_id = ${conversation_id}
              AND read = true
            ORDER BY id DESC
            LIMIT 1
          )
        `
      );

      return true;
    } catch (error) {
      throw new Error("Error marking as unread");
    } finally {
      await client.release(true);
    }
  }

  async getAllConversationsWithLastMessage(
    limit = "",
    offset,
    company_id,
    company_phone_id,
    search = "",
    unread = false,
    tags = "",
    initDate = null,
    endDate = null,
    overdue = false,
    user_id = null,
    user_role = null,
    user_assigned_id = null
  ) {
    const client = await this.pool.connect();

    let filter = "";
    let totalCount = 0;
    let totalPages = 1;
    let currentPage = 1;

    if ((!initDate || !endDate) && limit == "") {
      throw new Error("Incorrect parameters");
    }

    if ("" !== search) {
      filter += ` AND (c2.phone ilike '%${search}%' or c2."name" ilike '%${search}%')`;
    }

    if ("true" == unread) {
      filter += ` AND (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND "read" = false) > 0`;
    }

    if ("true" == overdue) {
      filter += ` AND to_timestamp(c.last_message_time) <= (NOW() - INTERVAL '24 hours')`;
    }

    if ("" !== tags) {
      filter += ` AND (EXISTS (SELECT 1 FROM conversations_tags ct WHERE ct.conversation_id = c.id AND ct.tag_id IN (${tags})))`;
    }

    if (null !== initDate) {
      const initDateFormat = new Date(initDate);
      const initDateTime = initDateFormat.getTime() / 1000;
      filter += ` AND c.last_message_time >= '${initDateTime}'`;
    }

    if (null !== endDate) {
      const endDateFormat = new Date(endDate);
      const endDateTime = endDateFormat.getTime() / 1000;
      filter += ` AND c.last_message_time <= '${endDateTime}'`;
    }

    if (null !== user_assigned_id) {
      filter += ` AND uc.user_id = '${user_assigned_id}'`;
    }

    try {
      const countQuery = await client.query(
        `
        SELECT COUNT(*) AS total_count
        FROM conversations c
        LEFT JOIN contacts c2 ON c.contact_id = c2.id
        LEFT JOIN (
          SELECT uc.conversation_id, uc.user_id
          FROM user_conversation uc
          JOIN (
            SELECT conversation_id, MAX(id) AS max_id
            FROM user_conversation
            GROUP BY conversation_id
          ) latest_uc ON uc.id = latest_uc.max_id
        ) uc ON c.id = uc.conversation_id
        WHERE c.company_id = $1 AND c.company_phone_id = $2 ${filter};
      `,
        [company_id, company_phone_id]
      );

      totalCount = countQuery.rows[0].total_count;

      if ("" != limit) {
        totalPages = Math.ceil(totalCount / limit);
        currentPage = Math.floor(offset / limit) + 1;
        if (user_role != null && user_role != 1) {
          filter += ` AND (uc.user_id IS NULL OR uc.user_id = ${user_id})`;
        }
      }

      const conversations = await client.query(
        `
          SELECT 
            c.id, 
            c.last_message_time, 
            c.contact_id,
            COALESCE(mu.unread_count, 0) AS unread_count,
            uc.user_id AS user_assigned_id,
            c.company_phone_id,
            u.username AS user_assigned_name,
            lm.message_created_at
          FROM conversations c
          LEFT JOIN (
            SELECT 
              m.conversation_id, 
              MAX(m.created_at) AS message_created_at
            FROM messages m
            GROUP BY m.conversation_id
          ) lm ON c.id = lm.conversation_id
          LEFT JOIN (
            SELECT conversation_id, COUNT(*) AS unread_count
            FROM messages
            WHERE "read" = false
            GROUP BY conversation_id
          ) mu ON c.id = mu.conversation_id
          LEFT JOIN contacts c2 ON c.contact_id = c2.id
          LEFT JOIN (
            SELECT uc.conversation_id, uc.user_id
            FROM user_conversation uc
            INNER JOIN (
              SELECT conversation_id, MAX(id) AS max_id
              FROM user_conversation
              GROUP BY conversation_id
            ) latest_uc ON uc.id = latest_uc.max_id
          ) uc ON c.id = uc.conversation_id
          LEFT JOIN users u ON uc.user_id = u.id
          WHERE c.company_id = $1 
            AND c.company_phone_id = $4 ${filter}
          GROUP BY 1,2,3,4,5,6,7,8
          ORDER BY lm.message_created_at DESC NULLS LAST
          LIMIT $2 OFFSET $3;
        `,
        [company_id, limit, offset, company_phone_id]
      );

      const response = await Promise.all(
        conversations.rows.map(async (conv) => {

          // Obtener el contacto
          conv.contact = await this.contactModel.getContactById(
            conv.contact_id,
            company_id,
            client
          );

          // Obtener las etiquetas
          conv.tags = await this.getTagsByConversation(conv.id, client);

          // Obtener el último mensaje completo
          const lastMessage = await client.query(
            `
              SELECT 
                COALESCE(tm.body, rm.emoji) AS last_message, 
                m.message_type, 
                m.status
              FROM messages m
              LEFT JOIN text_messages tm ON tm.message_id = m.id
              LEFT JOIN reaction_messages rm ON rm.message_id = m.id
              WHERE m.conversation_id = $1
              ORDER BY m.created_at DESC
              LIMIT 1;
            `,
            [conv.id]
          );
          const message = lastMessage.rows[0];
          conv = { ...conv, ...message };
          return conv;
        })
      );

      return {
        conversations: response,
        totalPages,
        currentPage,
      };
    } catch (error) {
      console.log(error)
      throw new Error("Error fetching conversations");
    } finally {
      await client.release(true);
    }
  }

  async getConversationByIdWithLastMessage(conversationId) {
    const client = await this.pool.connect();

    try {
      const conversations = await client.query(
        `
          SELECT c.id, 
            c.company_phone_id, 
            c.last_message_time, 
            m.body AS last_message, 
            m.message_type, 
            m.status, 
            m.message_created_at, 
            c.contact_id, 
            c.company_id,
            (
              SELECT COUNT(*)
              FROM messages 
              WHERE conversation_id = c.id AND "read" = false
            ) AS unread_count,
            uc.user_id AS user_assigned_id,
            u.username as user_assigned_name
          FROM conversations c
          LEFT JOIN (
              SELECT m1.conversation_id, 
                COALESCE(tm.body, rm.emoji) AS body, 
                m1.message_type, 
                m1.created_at AS message_created_at, 
                m1.status
              FROM messages m1
              LEFT JOIN text_messages tm ON tm.message_id = m1.id
              LEFT JOIN reaction_messages rm ON rm.message_id = m1.id
              WHERE m1.created_at = (
                SELECT MAX(m2.created_at)
                FROM messages m2
                WHERE m2.conversation_id = m1.conversation_id
              )
          ) m ON c.id = m.conversation_id
          LEFT JOIN contacts c2 ON c2.id = c.contact_id AND c2."type" = 'client'
          LEFT JOIN (
              SELECT uc.conversation_id, uc.user_id
              FROM user_conversation uc
              JOIN (
                SELECT conversation_id, MAX(id) AS max_id
                FROM user_conversation
                GROUP BY conversation_id
              ) latest_uc ON uc.id = latest_uc.max_id
          ) uc ON c.id = uc.conversation_id
          LEFT JOIN users u ON uc.user_id = u.id 
          WHERE c.id = $1
          LIMIT 1;
        `,
        [conversationId]
      );

      conversations.rows[0].contact = await this.contactModel.getContactById(
        conversations.rows[0].contact_id,
        conversations.rows[0].company_id,
        client
      );

      conversations.rows[0].tags = await this.getTagsByConversation(
        conversationId,
        client
      );

      return conversations.rows[0];
    } catch (error) {
      console.log(error);
      throw new Error("Error fetching conversations");
    } finally {
      await client.release(true);
    }
  }

  async getConversationById(
    conversationId,
    company_id,
    user_id = null,
    user_role = null
  ) {
    const client = await this.pool.connect();

    try {
      let filter = "";
      if (null !== user_id && user_role != null && user_role != 1) {
        filter += ` AND (uc.user_id IS NULL OR uc.user_id = ${user_id})`;
      }
      const conversations = await client.query(
        `
          SELECT c.id, 
            c.last_message_time, 
            c.company_id, 
            c.contact_id, 
            c.origin, 
            m.id AS last_message_id,
            cp.wp_phone_id, 
            cp.waba_id, 
            cp.bussines_id, 
            cp.wp_bearer_token, 
            cp.id AS company_phone_id, 
            uc.user_id AS user_assigned_id,
            c.company_phone_id,
            u.username as user_assigned_name
          FROM conversations c
          LEFT JOIN (
            SELECT m1.id, m1.conversation_id
            FROM messages m1
            WHERE m1.id = (
              SELECT MAX(m2.id)
              FROM messages m2
              WHERE m2.conversation_id = m1.conversation_id
            )
          ) m ON m.conversation_id = c.id
          LEFT JOIN companies_phones cp ON c.company_phone_id = cp.id
          LEFT JOIN (
            SELECT uc.conversation_id, uc.user_id
            FROM user_conversation uc
            JOIN (
              SELECT conversation_id, MAX(id) AS max_id
              FROM user_conversation
              GROUP BY conversation_id
            ) latest_uc ON uc.id = latest_uc.max_id
          ) uc ON c.id = uc.conversation_id
          LEFT JOIN users u ON uc.user_id = u.id 
          WHERE c.id = $1 
            AND c.company_id = $2 ${filter}
          LIMIT 1;
        `,
        [conversationId, company_id]
      );

      return conversations.rows[0];
    } catch (error) {
      throw new Error("Error fetching conversation");
    } finally {
      await client.release(true);
    }
  }

  async deleteConversationById(conversationId, company_id) {
    const client = await this.pool.connect();

    try {
      const conversations = await client.query(
        `SELECT 1 FROM conversations
        WHERE id = $1
          AND company_id = $2`,
        [conversationId, company_id]
      );

      if (!conversations.rows.length) {
        return false;
      }

      await client.query(
        `DELETE FROM audio_messages cam
        USING messages m
        WHERE cam.message_id = m.id
          AND m.conversation_id = $1`,
        [conversationId]
      );

      await client.query(
        `DELETE FROM button_messages cbm
        USING messages m
        WHERE cbm.message_id = m.id
          AND m.conversation_id = $1`,
        [conversationId]
      );

      await client.query(
        `DELETE FROM document_messages cdm
        USING messages m
        WHERE cdm.message_id = m.id
          AND m.conversation_id = $1`,
        [conversationId]
      );

      await client.query(
        `DELETE FROM image_messages cim
        USING messages m
        WHERE cim.message_id = m.id
          AND m.conversation_id = $1`,
        [conversationId]
      );

      await client.query(
        `DELETE FROM interactive_messages cim
        USING messages m
        WHERE cim.message_id = m.id
          AND m.conversation_id = $1`,
        [conversationId]
      );

      await client.query(
        `DELETE FROM location_messages clm
        USING messages m
        WHERE clm.message_id = m.id
          AND m.conversation_id = $1`,
        [conversationId]
      );

      await client.query(
        `DELETE FROM order_messages com
        USING messages m
        WHERE com.message_id = m.id
          AND m.conversation_id = $1`,
        [conversationId]
      );

      await client.query(
        `DELETE FROM reaction_messages crm
        USING messages m
        WHERE crm.message_id = m.id
          AND m.conversation_id = $1`,
        [conversationId]
      );

      await client.query(
        `DELETE FROM sticker_messages csm
        USING messages m
        WHERE csm.message_id = m.id
          AND m.conversation_id = $1`,
        [conversationId]
      );

      await client.query(
        `DELETE FROM templates_messages ctm
        USING messages m
        WHERE ctm.message_id = m.id
          AND m.conversation_id = $1`,
        [conversationId]
      );

      await client.query(
        `DELETE FROM text_messages ctm
        USING messages m
        WHERE ctm.message_id = m.id
          AND m.conversation_id = $1`,
        [conversationId]
      );

      await client.query(
        `DELETE FROM video_messages cvm
        USING messages m
        WHERE cvm.message_id = m.id
          AND m.conversation_id = $1`,
        [conversationId]
      );

      await client.query(
        `DELETE FROM messages_referral mr
        USING messages m
        WHERE mr.message_id = m.id
          AND m.conversation_id = $1`,
        [conversationId]
      );

      await client.query(
        `DELETE FROM messages m
        WHERE m.conversation_id = $1`,
        [conversationId]
      );

      await client.query(
        `DELETE FROM conversations_tags ct
        WHERE ct.conversation_id = $1`,
        [conversationId]
      );

      await client.query(
        `DELETE FROM user_conversation uc
        WHERE uc.conversation_id = $1`,
        [conversationId]
      );

      await client.query(
        `DELETE FROM conversations c
        WHERE c.id = $1
          AND c.company_id = $2`,
        [conversationId, company_id]
      );

      return true;
    } catch (error) {
      console.log(error);
      throw new Error("Error deleting conversation");
    } finally {
      await client.release(true);
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
      const totalCountQuery = await client.query(
        `
      SELECT COUNT(*) AS total_count
      FROM messages m
      LEFT JOIN conversations c ON c.id = m.conversation_id
      WHERE c.id = $1
      AND c.company_id = $2
      `,
        [conversationId, company_id]
      );

      const totalCount = parseInt(totalCountQuery.rows[0].total_count, 10);
      const totalPages = Math.ceil(totalCount / limit);

      const messages = await client.query(
        `
        SELECT m.id, m.conversation_id, m.message_type, m.created_at, m.message_id AS id_whatsapp, m.status, m."read",
          t.body AS text_message, t.id AS text_message_id, r.id AS reaction_message_id,
          r.emoji AS reaction_message_emoji, r.reacted_message_id AS reaction_message_reacted_message_id,
          v.id AS video_message_id, v.sha256 AS video_message_sha256, v.mime_type AS video_message_mime_type, v.caption AS video_caption,
          v.video_id as video_media_id, s.id AS sticker_message_id, s.sha256 AS sticker_message_sha256,
          s.animated AS sticker_message_animated, s.mime_type AS sticker_message_mime_type, s.sticker_id as sticker_media_id,
          a.id AS audio_message_id, a.voice AS audio_message_voice, a.sha256 AS audio_message_sha256, a.mime_type AS audio_message_mime_type,
          a.audio_id as audio_media_id, i.id AS image_message_id, i.sha256 AS image_message_sha256, i.mime_type AS image_message_mime_type,
          i.image_id as image_media_id, i.caption AS image_caption, l.latitude AS location_message_latitude, l.longitude AS location_message_longitude,
          d.id AS document_message_id, d.sha256 AS document_message_sha256, d.filename AS document_message_filename,
          d.mime_type AS document_message_mime_type, d.document_id as document_media_id, m2.url, m2.file_size, tp.template, tp.id as template_message_id,
          b.text as button_text, b.payload as button_payload, b.id as button_message_id, b.reacted_message_id as button_reacted_message_id, m.context_message_id,
          im.id AS interactive_message_id, im.interactive AS interactive_json,
          om.id AS order_message_id, om.order AS order_json,
          cp.wp_phone_id, cp.waba_id, cp.bussines_id, cp.wp_bearer_token,
          mr.id as mr_id, mr.body as mr_body, mr.headline as mr_headline, mr.ctwa_clid as mr_ctwa_clid, mr.image_url as mr_image_url, mr.source_id as mr_source_id, mr.media_type as mr_media_type, mr.source_url as mr_source_url, mr.source_type as mr_source_type
        FROM messages m
        LEFT JOIN text_messages t ON t.message_id = m.id
        LEFT JOIN reaction_messages r ON r.message_id = m.id
        LEFT JOIN video_messages v ON v.message_id = m.id
        LEFT JOIN sticker_messages s ON s.message_id = m.id
        LEFT JOIN audio_messages a ON a.message_id = m.id
        LEFT JOIN image_messages i ON i.message_id = m.id
        LEFT JOIN location_messages l ON l.message_id = m.id
        LEFT JOIN document_messages d ON d.message_id = m.id
        LEFT JOIN templates_messages tp ON tp.message_id = m.id
        LEFT JOIN button_messages b ON b.message_id = m.id
        LEFT JOIN interactive_messages im ON im.message_id = m.id
        LEFT JOIN order_messages om ON om.message_id = m.id
        LEFT JOIN messages_referral mr ON mr.message_id = m.id
        LEFT JOIN media m2 ON m2.message_id = m.id
        LEFT JOIN conversations c ON c.id = m.conversation_id
        LEFT JOIN companies_phones cp ON c.company_phone_id = cp.id
        WHERE c.id = $1
        AND c.company_id = $4
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3`,
        [conversationId, limit, offset, company_id]
      );

      const formattedMessages = await Promise.all(
        messages.rows.map(async (message) => {
          const { wp_bearer_token } = message;
          const formatMessage = this.formatMessage(message);

          if (
            ["document", "image", "audio", "video", "sticker"].includes(
              formatMessage.message_type
            ) &&
            formatMessage.message.url == null
          ) {
            try {
              const media = await withTimeout(
                this.mediaController.getMedia(
                  formatMessage.message.media_id,
                  wp_bearer_token
                ),
                5000
              );
              formatMessage.message.url = media?.url ?? null;
              formatMessage.message.file_size = media?.file_size ?? null;
            } catch (error) {
              console.error("Error retrieving media:", error.message);
              formatMessage.message.url = null;
              formatMessage.message.file_size = null;
            }
          }

          return formatMessage;
        })
      );

      return {
        messages: formattedMessages,
        totalPages,
        currentPage: Math.floor(offset / limit) + 1,
      };
    } catch (error) {
      console.log(error);
      throw new Error("Error fetching messages");
    } finally {
      await client.release(true);
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
          v.id AS video_message_id, v.sha256 AS video_message_sha256, v.mime_type AS video_message_mime_type, v.caption AS video_caption,
          v.video_id as video_media_id, s.id AS sticker_message_id, s.sha256 AS sticker_message_sha256,
          s.animated AS sticker_message_animated, s.mime_type AS sticker_message_mime_type, s.sticker_id as sticker_media_id,
          a.id AS audio_message_id, a.voice AS audio_message_voice, a.sha256 AS audio_message_sha256, a.mime_type AS audio_message_mime_type,
          a.audio_id as audio_media_id, i.id AS image_message_id, i.sha256 AS image_message_sha256, i.mime_type AS image_message_mime_type,
          i.image_id as image_media_id, i.caption AS image_caption, l.latitude AS location_message_latitude, l.longitude AS location_message_longitude,
          d.id AS document_message_id, d.sha256 AS document_message_sha256, d.filename AS document_message_filename,
          d.mime_type AS document_message_mime_type, d.document_id as document_media_id, m2.url, m2.file_size, tp.template, tp.id as template_message_id,
          b.text as button_text, b.payload as button_payload, b.id as button_message_id, b.reacted_message_id as button_reacted_message_id, m.context_message_id,
          cp.wp_phone_id, cp.waba_id, cp.bussines_id, cp.wp_bearer_token,
          im.id AS interactive_message_id, im.interactive AS interactive_json,
          om.id AS order_message_id, om.order AS order_json,
          mr.id as mr_id, mr.body as mr_body, mr.headline as mr_headline, mr.ctwa_clid as mr_ctwa_clid, mr.image_url as mr_image_url, mr.source_id as mr_source_id, mr.media_type as mr_media_type, mr.source_url as mr_source_url, mr.source_type as mr_source_type
        FROM messages m
        LEFT JOIN text_messages t ON t.message_id = m.id
        LEFT JOIN reaction_messages r ON r.message_id = m.id
        LEFT JOIN video_messages v ON v.message_id = m.id
        LEFT JOIN sticker_messages s ON s.message_id = m.id
        LEFT JOIN audio_messages a ON a.message_id = m.id
        LEFT JOIN image_messages i ON i.message_id = m.id
        LEFT JOIN location_messages l ON l.message_id = m.id
        LEFT JOIN document_messages d ON d.message_id = m.id
        LEFT JOIN templates_messages tp ON tp.message_id = m.id
        LEFT JOIN button_messages b ON b.message_id = m.id
        LEFT JOIN media m2 ON m2.message_id = m.id
        LEFT JOIN interactive_messages im ON im.message_id = m.id
        LEFT JOIN order_messages om ON om.message_id = m.id
        LEFT JOIN messages_referral mr ON mr.message_id = m.id
        LEFT JOIN conversations c ON c.id = m.conversation_id
        LEFT JOIN companies_phones cp ON c.company_phone_id = cp.id
        WHERE m.id = $1 LIMIT 1
      `,
        [messageId]
      );
      const { wp_bearer_token } = messages.rows[0];
      const formatMessage = this.formatMessage(messages.rows[0]);
      if (
        ["document", "image", "audio", "video", "sticker"].includes(
          formatMessage.message_type
        ) &&
        formatMessage.message.url == null &&
        formatMessage.message.media_id !== null
      ) {
        const media = await this.mediaController.getMedia(
          formatMessage.message.media_id,
          wp_bearer_token
        );
        if (media) {
          formatMessage.message.url = media.url;
          formatMessage.message.file_size = media.file_size;
        }
      }

      return formatMessage;
    } catch (error) {
      throw new Error("Error fetching messages");
    } finally {
      await client.release(true);
    }
  }

  async createMessage(conversationId, messageData, company_id) {
    const client = await this.pool.connect();
    const conversation = await this.getConversationById(
      conversationId,
      company_id
    );
    try {
      await client.query("BEGIN");

      let context_message_id = null;
      if ("context" in messageData) {
        context_message_id = messageData.context.message_id;
      }
      const result = await client.query(
        `
          INSERT INTO public.messages (message_type, conversation_id, status, read, context_message_id)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id`,
        [messageData.type, conversationId, "trying", "true", context_message_id]
      );
      const messageId = result.rows[0].id;

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
          const imageMedia = await this.mediaController.uploadMedia(
            messageData.image.data,
            messageData.image.mime_type,
            conversation.wp_phone_id,
            conversation.wp_bearer_token
          );

          if (imageMedia) {
            messageData.image.id = imageMedia.id;
            await this.insertMessageData(
              client,
              messageId,
              "image_messages",
              "image_id, mime_type, caption",
              [
                imageMedia.id,
                messageData.image.mime_type,
                messageData.image.caption,
              ]
            );
            delete messageData.image.data;
            delete messageData.image.mime_type;
          }
          break;
        case "video":
          const videoMedia = await this.mediaController.uploadMedia(
            messageData.video.data,
            messageData.video.mime_type,
            conversation.wp_phone_id,
            conversation.wp_bearer_token
          );

          if (videoMedia) {
            messageData.video.id = videoMedia.id;
            await this.insertMessageData(
              client,
              messageId,
              "video_messages",
              "video_id, mime_type, caption",
              [
                videoMedia.id,
                messageData.video.mime_type,
                messageData.video.caption,
              ]
            );
            delete messageData.video.data;
            delete messageData.video.mime_type;
          }
          break;
        case "sticker":
          const stickerMedia = await this.mediaController.uploadMedia(
            messageData.sticker.data,
            messageData.sticker.mime_type,
            conversation.wp_phone_id,
            conversation.wp_bearer_token
          );

          if (stickerMedia) {
            messageData.sticker.id = stickerMedia.id;
            await this.insertMessageData(
              client,
              messageId,
              "sticker_messages",
              "sticker_id, mime_type",
              [stickerMedia.id, messageData.sticker.mime_type]
            );
            delete messageData.sticker.data;
            delete messageData.sticker.mime_type;
          }
          break;
        case "audio":
          const audioMedia = await this.mediaController.uploadMedia(
            messageData.audio.data,
            messageData.audio.mime_type,
            conversation.wp_phone_id,
            conversation.wp_bearer_token
          );

          if (audioMedia) {
            messageData.audio.id = audioMedia.id;
            await this.insertMessageData(
              client,
              messageId,
              "audio_messages",
              "audio_id, voice, mime_type",
              [audioMedia.id, true, messageData.audio.mime_type]
            );
            delete messageData.audio.data;
            delete messageData.audio.mime_type;
          }
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
        case "document":
          const document = await this.mediaController.uploadMedia(
            messageData.document.data,
            messageData.document.mime_type,
            conversation.wp_phone_id,
            conversation.wp_bearer_token
          );

          if (document) {
            messageData.document.id = document.id;

            await this.insertMessageData(
              client,
              messageId,
              "document_messages",
              "document_id, filename, mime_type",
              [
                document.id,
                messageData.document.filename,
                messageData.document.mime_type,
              ]
            );
            delete messageData.document.data;
            delete messageData.document.mime_type;
          }
          break;
        // case "interactive":
        case "template":
          const template = await this.templateModel.getTemplateById(
            conversation.company_phone_id,
            messageData.template.id
          );

          const finalJson = {
            header: {
              type: "",
              data: "",
            },
            body: "",
            footer: "",
            buttons: [],
          };

          template.components.forEach(async (component) => {
            switch (component.type.toLowerCase()) {
              case "header":
                let headerFromMessage = messageData.template.components.find(
                  (comp) => comp.type == "header"
                );

                switch (component.format.toLowerCase()) {
                  case "image":
                    finalJson.header.type = "image";
                    finalJson.header.data =
                      headerFromMessage.parameters[0].image.link;
                    break;

                  // case "image":
                  //   const imageMedia = await this.mediaController.uploadMedia(
                  //     headerFromMessage.parameters[0].image.data,
                  //     headerFromMessage.parameters[0].image.mime_type,
                  //     conversation.wp_phone_id,
                  //     conversation.wp_bearer_token
                  //   );

                  //   if (imageMedia) {
                  //     headerFromMessage.parameters[0].image.id = imageMedia.id;
                  //     finalJson.header = imageMedia.id;
                  //     delete headerFromMessage.parameters[0].image.data;
                  //     delete headerFromMessage.parameters[0].image.mime_type;
                  //   } else {
                  //     throw new Error(`Invalid image for template`);
                  //   }

                  //   break;
                  case "text":
                    let text = component.text;
                    if (headerFromMessage) {
                      headerFromMessage.parameters.forEach(
                        (parameter, index) => {
                          const placeholder = `{{${index + 1}}}`;
                          const regex = new RegExp(
                            placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                            "g"
                          );
                          text = text.replace(regex, parameter.text);
                        }
                      );
                    }
                    finalJson.header.type = "text";
                    finalJson.header.data = text;
                    break;
                }
                break;

              case "body":
                let bodyFromMessage = messageData.template.components.find(
                  (comp) => comp.type == "body"
                );
                let text = component.text;

                if (bodyFromMessage) {
                  bodyFromMessage.parameters.forEach((parameter, index) => {
                    const placeholder = `{{${index + 1}}}`;
                    const regex = new RegExp(
                      placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                      "g"
                    );
                    text = text.replace(regex, parameter.text);
                  });
                }
                finalJson.body = text;

                break;

              case "footer":
                finalJson.footer = component.text;
                break;

              case "buttons":
                component.buttons.forEach((button) => {
                  switch (button.type.toLowerCase()) {
                    case "quick_reply":
                      finalJson.buttons.push({ text: button.text });
                      break;

                    case "url":
                      let url = button.url;
                      let buttonFromMessage =
                        messageData.template.components.find(
                          (comp) =>
                            comp.type == "button" &&
                            comp.sub_type.toLowerCase() == "url"
                        );

                      if (buttonFromMessage) {
                        const placeholder = `{{1}}`;
                        const regex = new RegExp(
                          placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                          "g"
                        );

                        // url = url.replace(
                        //   regex,
                        //   buttonFromMessage.parameters[0].text
                        // );

                        url = buttonFromMessage.parameters[0].text;
                      }

                      finalJson.buttons.push({
                        text: button.text,
                        url: url,
                      });
                      break;
                  }
                });
                break;
            }
          });

          await this.insertMessageData(
            client,
            messageId,
            "templates_messages",
            "template, template_id",
            [JSON.stringify(finalJson), messageData.template.id]
          );

          delete messageData.template.id;

          break;

        case "interactive":
          await this.insertMessageData(
            client,
            messageId,
            "interactive_messages",
            "interactive",
            [JSON.stringify(messageData.interactive)]
          );
          if ("product_list" == messageData.interactive.type) {
            messageData.interactive.action.sections.forEach((msg) => {
              msg.product_items.forEach((pr) => {
                delete pr.product_name;
              });
            });
          }

          if ("product" == messageData.interactive.type) {
            delete messageData.interactive.action.product_name;
          }

          break;
        default:
          throw new Error(`Invalid message type: ${messageData.type}`);
      }

      if (messageId) {
        const contact = await this.contactModel.getContactById(
          conversation.contact_id,
          company_id
        );

        const apiResponse = await this.sendMessageAPI(
          messageData,
          contact.phone,
          conversation.wp_phone_id,
          conversation.wp_bearer_token
        );

        if (
          apiResponse &&
          "messages" in apiResponse &&
          apiResponse.messages[0].id
        ) {
          const messageIdFromAPI = apiResponse.messages[0].id;
          this.updateMessageId(client, messageId, messageIdFromAPI);
        }

        await client.query("COMMIT");

        return messageId;
      } else {
        throw new Error("Error creating message, no ID");
      }
    } catch (error) {
      console.log(error);
      throw new Error("Error creating message");
    } finally {
      await client.release(true);
    }
  }

  async insertMessageData(
    client,
    messageId,
    tableName,
    columnNames,
    columnValues
  ) {
    try {
      const query = `INSERT INTO public.${tableName} (message_id, ${columnNames}) VALUES ($1, ${columnValues.map(
        (v, k) => "$" + (k + 2)
      )})`;
      const values = [messageId, ...columnValues];
      await client.query(query, values);
    } catch (error) {
      console.log(error);
    }
  }

  updateMessageId(client, messageId, messageIdFromAPI) {
    const query = "UPDATE public.messages SET message_id = $1 WHERE id = $2";
    const values = [messageIdFromAPI, messageId];
    client.query(query, values);
  }

  async sendMessageAPI(messageData, receiver, wp_phone_id, wp_bearer_token) {
    const requestBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: messageData.type,
    };

    if ("context" in messageData) {
      requestBody.context = messageData.context;
    }

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

    return await this.messageController.sendMessage(
      requestBody,
      wp_phone_id,
      wp_bearer_token
    );
  }

  formatMessage(data) {
    const formatMessage = {};
    formatMessage.id = data.id;
    formatMessage.conversation_id = data.conversation_id;
    formatMessage.message_type = data.message_type;
    formatMessage.status = data.status;
    formatMessage.body = data.body;
    formatMessage.read = data.read;
    formatMessage.message = {};
    formatMessage.referral = {};

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
        caption: data.video_caption,
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
        caption: data.image_caption,
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
    if (data.message_type == "template") {
      formatMessage.message = {
        id: data.template_message_id,
        template: data.template,
        id_whatsapp: data.id_whatsapp,
      };
    }
    if (data.message_type == "button") {
      formatMessage.message = {
        id: data.button_message_id,
        text: data.button_text,
        payload: data.button_payload,
        id_whatsapp: data.id_whatsapp,
      };
    }
    if (data.message_type == "interactive") {
      formatMessage.message = {
        id: data.interactive_message_id,
        json: data.interactive_json,
        id_whatsapp: data.id_whatsapp,
      };
    }
    if (data.message_type == "order") {
      formatMessage.message = {
        id: data.order_message_id,
        json: data.order_json,
        id_whatsapp: data.id_whatsapp,
      };
    }
    if (data.message_type == "unknown") {
      formatMessage.unknown_message = data.unknown_message;
    }
    formatMessage.created_at = data.created_at;

    if (null != data.mr_id) {
      formatMessage.referral = {
        id: data.mr_id,
        body: data.mr_body,
        headline: data.mr_headline,
        ctwa_clid: data.mr_ctwa_clid,
        image_url: data.mr_image_url,
        source_id: data.mr_source_id,
        media_type: data.mr_media_type,
        source_url: data.mr_source_url,
        source_type: data.mr_source_type,
      };
    }

    formatMessage.message.response_to = data.context_message_id;

    return formatMessage;
  }

  async assignTagToConversation(
    conversationId,
    tagId,
    company_id,
    fields = null
  ) {
    const client = await this.pool.connect();

    try {
      const tags = await client.query(
        `INSERT INTO conversations_tags (conversation_id, tag_id, fields)
        VALUES ($1, $2, $3)
        ON CONFLICT (conversation_id, tag_id)
        DO UPDATE SET conversation_id = EXCLUDED.conversation_id, fields = EXCLUDED.fields
        RETURNING *;`,
        [conversationId, tagId, fields ? JSON.stringify(fields) : null]
      );

      const tagInfo = await client.query(
        `SELECT t.name FROM tags t WHERE t.id = $1`,
        [tagId]
      );
      const conversationInfo = await client.query(
        `SELECT c.company_phone_id FROM conversations c WHERE c.id = $1`,
        [conversationId]
      );

      if (tagInfo.rows.length) {
        const flowInfo = await client.query(
          `SELECT af.template_data, af.id FROM public.auto_flow af WHERE af.flow_id = $1 AND af."source" = $2 AND company_phone_id = $3 AND backup = $4`,
          [
            tagId,
            `${tagId}-${tagInfo.rows[0].name}`,
            conversationInfo.rows[0].company_phone_id,
            0,
          ]
        );

        if (flowInfo.rows.length) {
          const currentDate = new Date();
          const formattedDate = `${currentDate.getFullYear()}-${(
            "0" +
            (currentDate.getMonth() + 1)
          ).slice(-2)}-${("0" + currentDate.getDate()).slice(-2)}`;

          (async () => {
            for (const row of flowInfo.rows) {
              const { id, template_data } = row;
              const hash = crypto
                .createHash("md5")
                .update(
                  [
                    id,
                    template_data,
                    company_id,
                    conversationId,
                    formattedDate,
                    conversationInfo.rows[0].company_phone_id,
                  ].join("")
                )
                .digest("hex");

              await this.queueModel.createJobToProcess(
                template_data,
                company_id,
                conversationId,
                hash
              );
            }
          })();
        }
      }

      return tags.rows[0];
    } catch (error) {
      console.log(error);
      throw new Error(
        "Error assigning tag on conversation ".json_encode(error)
      );
    } finally {
      await client.release(true);
    }
  }

  async removeTagToConversation(conversationId, tagId) {
    const client = await this.pool.connect();

    try {
      await client.query(
        "DELETE FROM conversations_tags WHERE conversation_id = $1 AND tag_id = $2",
        [conversationId, tagId]
      );
    } catch (error) {
      throw new Error("Error deleting on conversation");
    } finally {
      await client.release(true);
    }
  }

  async getTagsByConversation(conversationId, clientP) {
    const client = clientP ?? await this.pool.connect();
    let shouldRelease = !clientP;
    try {
      const tags = await client.query(
        `SELECT t.id, t."name", t.color, t.description, t.has_nested_form as "hasNestedForm", t.is_multiple as "isMultiple", ct.fields FROM public.conversations_tags ct LEFT JOIN tags t ON ct.tag_id = t.id WHERE ct.conversation_id = $1`,
        [conversationId]
      );
      return tags.rows;
    } catch (error) {
      throw new Error("Error getting tags of conversation");
    } finally {
      if (shouldRelease) {
        await client.release(true);
      }
    }
  }

  async saveScheduledTasks(
    tag,
    company_phone_id,
    user_id,
    conversations = null,
    phones = null,
    finalDispatchDate = new Date()
  ) {
    const client = await this.pool.connect();

    try {
      const newTask = await client.query(
        `INSERT INTO public.scheduled_tasks (tag, company_phone_id, user_id, conversations, phones, dispatch_date)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          tag,
          company_phone_id,
          user_id,
          conversations,
          phones,
          finalDispatchDate,
        ]
      );

      return newTask.rows[0];
    } catch (error) {
      throw new Error("Error scheduling task");
    } finally {
      await client.release(true);
    }
  }
  async assignUserToConversation(conversationId, user_id) {
    const client = await this.pool.connect();

    try {
      await client.query(
        `INSERT INTO user_conversation (user_id, conversation_id)
         VALUES ($1, $2)
         ON CONFLICT (conversation_id) DO UPDATE
         SET user_id = EXCLUDED.user_id
         WHERE user_conversation.user_id != EXCLUDED.user_id
         RETURNING *;`,
        [user_id, conversationId]
      );

      return;
    } catch (error) {
      throw new Error(
        "Error assigning tag on conversation ".json_encode(error)
      );
    } finally {
      await client.release(true);
    }
  }
}

function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Operation timed out")), ms)
  );
  return Promise.race([promise, timeout]);
}
