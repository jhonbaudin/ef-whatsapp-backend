export class ReportModel {
    constructor(pool) {
        this.pool = pool;
    }

    async getReport(initDate = null, endDate = null) {
        const client = await this.pool.connect();
        if ((!initDate || !endDate) && limit == "") {
            throw new Error("Incorrect parameters");
        }
        try {
            const report = {
                botMessages: [],
                receivedMessages: [],
                campaingMessages: [],
                totalConversations: [],
            };
            const botMessages = await client.query(
                `SELECT
                    COUNT(q.id) AS total,
                    cp.phone,
                    cp.alias
                FROM
                    queue q
                LEFT JOIN
                    conversations c ON q.conversation_id = c.id
                JOIN
                    companies_phones cp ON c.company_phone_id = cp.id
                WHERE
                    q.created_at BETWEEN $1 AND $2
                    AND q.processed = TRUE
                GROUP BY
                    c.company_phone_id, cp.phone, cp.alias`,
                [initDate, endDate]
            );

            const receivedMessages = await client.query(
                `SELECT
                    COUNT(m.id) AS total,
                    cp.phone,
                    cp.alias
                FROM
                    messages m
                LEFT JOIN
                    conversations c ON m.conversation_id = c.id
                JOIN
                    companies_phones cp ON c.company_phone_id = cp.id
                WHERE
                    m.status = $3
                    AND TO_TIMESTAMP(m.created_at) BETWEEN $1 AND $2
                GROUP BY
                    c.company_phone_id, cp.phone, cp.alias`,
                [initDate, endDate, "client"]
            );

            const campaingMessages = await client.query(
                `SELECT
                    COUNT(m.id) AS total,
                    cp.phone,
                    cp.alias
                FROM
                    messages_referral mr
                LEFT JOIN
                    messages m ON mr.message_id = m.id
                LEFT JOIN
                    conversations c ON m.conversation_id = c.id
                JOIN
                    companies_phones cp ON c.company_phone_id = cp.id
                WHERE
                    TO_TIMESTAMP(m.created_at) BETWEEN $1 AND $2
                GROUP BY
                    c.company_phone_id, cp.phone, cp.alias`,
                [initDate, endDate]
            );
            const totalConversations = await client.query(
                `SELECT
                    COUNT(DISTINCT c.id) AS total,
                    cp.phone,
                    cp.alias
                FROM
                    conversations c
                JOIN
                    companies_phones cp ON c.company_phone_id = cp.id
                JOIN
                    messages m ON c.id = m.conversation_id
                WHERE
                    TO_TIMESTAMP(m.created_at) BETWEEN $1 AND $2
                GROUP BY
                    c.company_phone_id, cp.phone, cp.alias;`,
                [initDate, endDate]
            );

            report.botMessages = botMessages.rows;
            report.receivedMessages = receivedMessages.rows;
            report.campaingMessages = campaingMessages.rows;
            report.totalConversations = totalConversations.rows;

            return report;
        } catch (error) {
            console.log(error);

            throw new Error("Error fetching report");
        } finally {
            await client.release(true);
        }
    }

    async getDetailsReport(initDate = null, endDate = null) {
        const client = await this.pool.connect();
        if ((!initDate || !endDate) && limit == "") {
            throw new Error("Incorrect parameters");
        }
        try {
            const report = {
                reportePrincipal: [],
                conversaciones: [],
                mensajesRecibidos: [],
                mensajesEnviados: [],
                mensajesEnviadosBot: [],
                mensajesRecibidosCampanias: [],
            };
            const reportePrincipal = await client.query(
                `
                WITH etiqueta_campos AS (
                    SELECT
                        ct.conversation_id,
                        t.name AS etiqueta,
                        STRING_AGG(
                            CONCAT(elem->>'name', ': ', elem->>'value'),
                            ', '
                        ) AS campos
                    FROM conversations_tags ct
                    LEFT JOIN tags t ON ct.tag_id = t.id
                    LEFT JOIN LATERAL jsonb_array_elements(ct.fields::jsonb) elem ON true
                    WHERE ct.fields IS NOT NULL
                    GROUP BY ct.conversation_id, t.name
                ),
                campos_transformados AS (
                    SELECT
                        conversation_id,
                        STRING_AGG(
                            CONCAT(etiqueta, ': ', campos),
                            ' | '
                        ) AS campos_por_etiqueta
                    FROM etiqueta_campos
                    WHERE campos IS NOT NULL
                    GROUP BY conversation_id
                )
                SELECT
                    cp.alias AS empresa,
                    cp.phone AS telefono,
                    u.username AS usuario,
                    c2."name" AS cliente,
                    c2.id AS id_cliente,
                    c2.phone AS telefono_cliente,
                    c.id AS id_conversacion,
                    STRING_AGG(DISTINCT t.name, ', ') AS etiquetas,
                    COALESCE(ct_agg.campos_por_etiqueta, '') AS campos_transformados,
                    m.message_type AS tipo_mensaje,
                    m.id AS id_mensaje,
                    CASE
                        WHEN m.status = 'client' AND mr.id IS NOT NULL THEN 'RECIBIDO CAMPANIA'
                        WHEN m.status = 'client' THEN 'RECIBIDO'
                        WHEN tm."template" IS NOT NULL THEN 'ENVIADO BOT'
                        ELSE 'ENVIADO MANUAL'
                    END AS forma_mensaje,
                    tm."template" AS plantilla,
                    to_timestamp(m.created_at) AS fecha_mensaje
                FROM
                    messages m
                LEFT JOIN conversations c ON c.id = m.conversation_id
                LEFT JOIN companies_phones cp ON c.company_phone_id = cp.id
                LEFT JOIN user_conversation uc ON c.id = uc.conversation_id
                LEFT JOIN users u ON uc.user_id = u.id
                LEFT JOIN contacts c2 ON c2.id = c.contact_id
                LEFT JOIN conversations_tags ct ON ct.conversation_id = c.id
                LEFT JOIN tags t ON ct.tag_id = t.id
                LEFT JOIN messages_referral mr ON mr.message_id = m.id
                LEFT JOIN templates_messages tm ON m.id = tm.message_id
                LEFT JOIN queue q ON q.conversation_id = c.id AND q.message = tm."template"::text
                LEFT JOIN campos_transformados ct_agg ON ct_agg.conversation_id = c.id
                WHERE
                    to_timestamp(m.created_at) BETWEEN $1 AND $2
                    AND cp.id IS NOT NULL
                GROUP BY
                    cp.alias,
                    cp.phone,
                    u.username,
                    c2."name",
                    c2.id,
                    c2.phone,
                    c.id,
                    ct_agg.campos_por_etiqueta,
                    m.message_type,
                    m.id,
                    tm."template",
                    mr.id
                ORDER BY m.created_at ASC;
                `,
                [initDate, endDate]
            );

            const conversaciones = await client.query(
                `
                WITH etiqueta_campos AS (
                    SELECT
                        ct.conversation_id,
                        t.name AS etiqueta,
                        STRING_AGG(
                            CONCAT(elem->>'name', ': ', elem->>'value'),
                            ', '
                        ) AS campos
                    FROM conversations_tags ct
                    LEFT JOIN tags t ON ct.tag_id = t.id
                    LEFT JOIN LATERAL jsonb_array_elements(ct.fields::jsonb) elem ON true
                    WHERE ct.fields IS NOT NULL
                    GROUP BY ct.conversation_id, t.name
                ),
                campos_agrupados AS (
                    SELECT
                        conversation_id,
                        STRING_AGG(
                            CONCAT(etiqueta, ': ', campos),
                            ' | '
                        ) AS campos_por_etiqueta
                    FROM etiqueta_campos
                    WHERE campos IS NOT NULL
                    GROUP BY conversation_id
                ),
                ultimo_mensaje AS (
                    SELECT
                        m.conversation_id,
                        MAX(m.created_at) AS ultima_fecha_mensaje
                    FROM messages m
                    WHERE to_timestamp(m.created_at) BETWEEN $1 AND $2
                    GROUP BY m.conversation_id
                )
                SELECT
                    c.id,
                    cp.alias,
                    cp.phone AS tlf_empresa,
                    to_timestamp(um.ultima_fecha_mensaje) AS fecha_ultimo_mensaje,
                    c2.phone AS tlf_cliente,
                    c2."name" AS nombre_cliente,
                    STRING_AGG(DISTINCT t.name, ', ') AS tags,
                    COALESCE(campos_agrupados.campos_por_etiqueta, '') AS campos_transformados
                FROM conversations c
                JOIN companies_phones cp ON cp.id = c.company_phone_id
                JOIN contacts c2 ON c.contact_id = c2.id
                LEFT JOIN conversations_tags ct ON ct.conversation_id = c.id
                LEFT JOIN tags t ON ct.tag_id = t.id
                LEFT JOIN campos_agrupados ON campos_agrupados.conversation_id = c.id
                JOIN ultimo_mensaje um ON um.conversation_id = c.id
                GROUP BY c.id, cp.alias, cp.phone, um.ultima_fecha_mensaje, c2.phone, c2.name, campos_agrupados.campos_por_etiqueta
                ORDER BY um.ultima_fecha_mensaje ASC;
                `,
                [initDate, endDate]
            );

            const mensajesRecibidos = await client.query(
                `SELECT
                    m.id,
                    message_type AS tipo_mensaje,
                    c.id AS id_conversacion,
                    cp.alias,
                    cp.phone AS tlf_empresa,
                    c2.phone AS tlf_cliente,
                    c2."name" AS nombre_cliente,
                    to_timestamp(m.created_at) AS fecha_mensaje
                FROM
                    messages m
                JOIN
                    conversations c ON c.id = m.conversation_id
                JOIN
                    companies_phones cp ON cp.id = c.company_phone_id
                JOIN
                    contacts c2 ON c.contact_id = c2.id
                WHERE
                    to_timestamp(m.created_at) BETWEEN $1 AND $2
                    AND m.status = $3
                ORDER BY m.created_at ASC
                `,
                [initDate, endDate, "client"]
            );

            const mensajesEnviados = await client.query(
                `SELECT
                    m.id,
                    message_type AS tipo_mensaje,
                    c.id AS id_conversacion,
                    cp.alias,
                    cp.phone AS tlf_empresa,
                    c2.phone AS tlf_cliente,
                    c2."name" AS nombre_cliente,
                    to_timestamp(m.created_at) AS fecha_mensaje
                FROM
                    messages m
                JOIN
                    conversations c ON c.id = m.conversation_id
                JOIN
                    companies_phones cp ON cp.id = c.company_phone_id
                JOIN
                    contacts c2 ON c.contact_id = c2.id
                WHERE
                    to_timestamp(m.created_at) BETWEEN $1 AND $2
                    AND m.status <> $3
                ORDER BY m.created_at ASC
                `,
                [initDate, endDate, "client"]
            );

            const mensajesEnviadosBot = await client.query(
                `SELECT
                    q.id,
                    q.message,
                    c.id AS id_conversacion,
                    cp.alias,
                    cp.phone AS tlf_empresa,
                    c2.phone AS tlf_cliente,
                    c2."name" AS nombre_cliente,
                    q.created_at AS fecha_mensaje
                FROM
                    queue q
                JOIN
                    conversations c ON c.id = q.conversation_id
                JOIN
                    companies_phones cp ON cp.id = c.company_phone_id
                JOIN
                    contacts c2 ON c.contact_id = c2.id
                WHERE
                    q.created_at BETWEEN $1 AND $2
                ORDER BY q.created_at ASC
                `,
                [initDate, endDate]
            );

            const mensajesRecibidosCampanias = await client.query(
                `SELECT
                    m.id,
                    message_type AS tipo_mensaje,
                    c.id AS id_conversacion,
                    cp.alias,
                    cp.phone AS tlf_empresa,
                    c2.phone AS tlf_cliente,
                    c2."name" AS nombre_cliente,
                    to_timestamp(m.created_at) AS fecha_mensaje
                FROM
                    messages m
                JOIN
                    messages_referral mr ON	mr.message_id = m.id
                JOIN
                    conversations c ON c.id = m.conversation_id
                JOIN
                    companies_phones cp ON cp.id = c.company_phone_id
                JOIN
                    contacts c2 ON c.contact_id = c2.id
                WHERE
                    to_timestamp(m.created_at) BETWEEN $1 AND $2
                    AND m.status = $3
                ORDER BY m.created_at ASC
                `,
                [initDate, endDate, "client"]
            );

            report.reportePrincipal = reportePrincipal.rows;
            report.conversaciones = conversaciones.rows;
            report.mensajesRecibidos = mensajesRecibidos.rows;
            report.mensajesEnviados = mensajesEnviados.rows;
            report.mensajesEnviadosBot = mensajesEnviadosBot.rows;
            report.mensajesRecibidosCampanias = mensajesRecibidosCampanias.rows;

            return report;
        } catch (error) {
            console.log(error);

            throw new Error("Error fetching report");
        } finally {
            await client.release(true);
        }
    }
}
