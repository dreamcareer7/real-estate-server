const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'DROP VIEW analytics.calendar',
  `CREATE OR REPLACE VIEW analytics.calendar AS (
    (
      SELECT
        id,
        created_by,
        'crm_task' AS object_type,
        task_type AS event_type,
        task_type AS type_label,
        due_date AS "timestamp",
        due_date AS "date",
        NULL::timestamptz AS next_occurence,
        end_date,
        False AS recurring,
        title,
        id AS crm_task,
        NULL::uuid AS deal,
        NULL::uuid AS contact,
        NULL::uuid AS campaign,
        NULL::uuid AS credential_id,
        NULL::text AS thread_key,
        (
          SELECT
            ARRAY_AGG("user")
          FROM
            crm_tasks_assignees
          WHERE
            crm_task = crm_tasks.id
            AND deleted_at IS NULL
        ) AS users,
        (
          SELECT
            ARRAY_AGG(contact)
          FROM
            (
              SELECT
                contact
              FROM
                crm_associations
              WHERE
                crm_task = crm_tasks.id
                AND deleted_at IS NULL
                AND association_type = 'contact'
              LIMIT 5
            ) t
        ) AS people,
        (
          SELECT
            COUNT(contact)::INT
          FROM
            crm_associations
          WHERE
            crm_task = crm_tasks.id
            AND deleted_at IS NULL
            AND association_type = 'contact'
          LIMIT 5
        ) AS people_len,
        brand,
        status,
        jsonb_build_object(
          'status', status
        ) AS metadata
      FROM
        crm_tasks
      WHERE
        deleted_at IS NULL
    )
    UNION ALL
    (
      SELECT
        ca.id,
        ca.created_by,
        'crm_association' AS object_type,
        ct.task_type AS event_type,
        ct.task_type AS type_label,
        ct.due_date AS "timestamp",
        ct.due_date AS "date",
        NULL::timestamptz AS next_occurence,
        ct.end_date,
        False AS recurring,
        ct.title,
        ct.id AS crm_task,
        ca.deal,
        ca.contact,
        ca.email AS campaign,
        NULL::uuid AS credential_id,
        NULL::text AS thread_key,
        (
          SELECT
            ARRAY_AGG("user")
          FROM
            crm_tasks_assignees
          WHERE
            crm_task = ct.id
            AND deleted_at IS NULL
        ) AS users,
        (
          SELECT
            ARRAY_AGG(contact)
          FROM
            (
              SELECT
                contact
              FROM
                crm_associations
              WHERE
                crm_task = ct.id
                AND deleted_at IS NULL
                AND association_type = 'contact'
              LIMIT 5
            ) t
        ) AS people,
        (
          SELECT
            COUNT(contact)::INT
          FROM
            crm_associations
          WHERE
            crm_task = ct.id
            AND deleted_at IS NULL
            AND association_type = 'contact'
        ) AS people_len,
        ct.brand,
        ct.status,
        jsonb_build_object(
          'status', ct.status
        ) AS metadata
      FROM
        crm_associations AS ca
        JOIN crm_tasks AS ct
          ON ca.crm_task = ct.id
      WHERE
        ca.deleted_at IS NULL
        AND ct.deleted_at IS NULL
    )
    UNION ALL
    (
      SELECT
        cdc.id,
        deals.created_by,
        'deal_context' AS object_type,
        cdc."key" AS event_type,
        bc.label AS type_label,
        cdc."date" AS "timestamp",
        timezone('UTC', date_trunc('day', cdc."date")) AT TIME ZONE 'UTC' AS "date",
        cdc."date" AS next_occurence,
        NULL::timestamptz AS end_date,
        False AS recurring,
        deals.title,
        NULL::uuid AS crm_task,
        cdc.deal,
        NULL::uuid AS contact,
        NULL::uuid AS campaign,
        NULL::uuid AS credential_id,
        NULL::text AS thread_key,
        (
          SELECT
            ARRAY_AGG(DISTINCT r."user")
          FROM
            deals_roles AS r
          WHERE
            r.deal = deals.id
            AND r.deleted_at IS NULL
            AND r."user" IS NOT NULL
        ) AS users,
        NULL::uuid[] AS people,
        NULL AS people_len,
        COALESCE(dr.brand, deals.brand) AS brand,
        NULL::text AS status,
        NULL::jsonb AS metadata
      FROM
        current_deal_context cdc
        JOIN deals
          ON cdc.deal = deals.id
        JOIN brands_contexts bc
          ON bc.id = cdc.definition
        JOIN deals_checklists dcl
          ON dcl.id = cdc.checklist
        LEFT JOIN (SELECT id, deal, brand FROM deals_roles WHERE brand IS NOT NULL AND deleted_at IS NULL) dr
          ON deals.id = dr.deal
      WHERE
        deals.deleted_at IS NULL
        AND cdc.data_type = 'Date'::context_data_type
        AND dcl.deleted_at     IS NULL
        AND dcl.deactivated_at IS NULL
        AND dcl.terminated_at  IS NULL
        AND deals.faired_at    IS NOT NULL
        AND deal_status_mask(deals.id, '{Withdrawn,Cancelled,"Contract Terminated"}', cdc.key, '{expiration_date}'::text[], '{Sold,Leased}'::text[]) IS NOT FALSE
    )
    UNION ALL
    (
      SELECT
        cdc.id,
        deals.created_by,
        'deal_context' AS object_type,
        'home_anniversary' AS event_type,
        'Home Anniversary' AS type_label,
        cdc."date" AS "timestamp",
        timezone('UTC', date_trunc('day', cdc."date")) AT TIME ZONE 'UTC' AS "date",
        cast(cdc."date" + ((extract(year from age(cdc."date")) + 1) * interval '1 year') as date) AS next_occurence,
        NULL::timestamptz AS end_date,
        True AS recurring,
        deals.title,
        NULL::uuid AS crm_task,
        cdc.deal,
        cr.contact,
        NULL::uuid AS campaign,
        NULL::uuid AS credential_id,
        NULL::text AS thread_key,
        (
          SELECT
            ARRAY_AGG(DISTINCT r."user")
          FROM
            deals_roles AS r
          WHERE
            r.deal = deals.id
            AND r.deleted_at IS NULL
            AND r."user" IS NOT NULL
        ) AS users,
        (
          SELECT
            ARRAY_AGG(contact)
          FROM
            contacts_roles
          WHERE
            role_name = 'Buyer'
            AND deal = deals.id
        ) AS people,
        NULL AS people_len,
        cr.brand,
        NULL::text AS status,
        NULL::jsonb AS metadata
      FROM
        current_deal_context cdc
        JOIN deals
          ON cdc.deal = deals.id
        JOIN brands_contexts bc
          ON bc.id = cdc.definition
        JOIN deals_checklists dcl
          ON dcl.id = cdc.checklist
        -- JOIN brands_checklists bcl
        --   ON dcl.origin = bcl.id
        JOIN contacts_roles cr
          ON (deals.id = cr.deal)
      WHERE
        deals.deleted_at IS NULL
        AND (
          (cdc.key = 'closing_date' AND cdc.date < NOW())
          OR cdc.key = 'lease_end'
        )
        AND cr.role_name = 'Buyer'
        AND deals.deal_type = 'Buying'
        -- AND bcl.deal_type = 'Buying'
        AND dcl.deleted_at     IS NULL
        AND dcl.deactivated_at IS NULL
        -- AND bcl.deleted_at     Is NULL
        AND dcl.terminated_at  IS NULL
        AND deals.faired_at    IS NOT NULL
        AND deal_status_mask(deals.id, '{Withdrawn,Cancelled,"Contract Terminated"}', cdc.key, '{expiration_date}'::text[], '{Sold,Leased}'::text[]) IS NOT FALSE
    )
    UNION ALL
    (
      SELECT
        ca.id,
        contacts.created_by,
        'contact_attribute' AS object_type,
        COALESCE(cad.name, cad.label) AS event_type,
        (CASE
          WHEN attribute_type = 'birthday' AND is_partner IS TRUE THEN 'Spouse Birthday'
          WHEN attribute_type = 'child_birthday' THEN COALESCE('Child Birthday (' || ca.label || ')', 'Child Birthday')
          ELSE COALESCE(cad.label, cad.name)
        END) AS type_label,
        "date" AS "timestamp",
        timezone('UTC', date_trunc('day', "date")::timestamp) AT TIME ZONE 'UTC' AS "date",
        cast("date" + ((extract(year from age("date")) + 1) * interval '1' year) as date) as next_occurence,
        NULL::timestamptz AS end_date,
        True AS recurring,
        (CASE
          WHEN attribute_type = 'birthday' AND ca.is_partner IS TRUE THEN
            array_to_string(ARRAY['Spouse Birthday', '(' || contacts.partner_name || ')', '- ' || contacts.display_name], ' ')
          WHEN attribute_type = 'birthday' AND ca.is_partner IS NOT TRUE THEN
            contacts.display_name || $$'s Birthday$$
          WHEN attribute_type = 'child_birthday' AND ca.label IS NOT NULL AND LENGTH(ca.label) > 0 THEN
            array_to_string(ARRAY['Child Birthday', '(' || ca.label || ')', '- ' || contacts.display_name], ' ')
          WHEN attribute_type = 'child_birthday' AND (ca.label IS NULL OR LENGTH(ca.label) = 0) THEN
            'Child Birthday - ' || contacts.display_name
          WHEN attribute_type = ANY('{
            work_anniversary,
            wedding_anniversary,
            home_anniversary
          }'::text[]) THEN
            contacts.display_name || $$'s $$  || cad.label
          ELSE
            contacts.display_name
        END) AS title,
        NULL::uuid AS crm_task,
        NULL::uuid AS deal,
        contact,
        NULL::uuid AS campaign,
        NULL::uuid AS credential_id,
        NULL::text AS thread_key,
        ARRAY[contacts."user"] AS users,
        NULL::uuid[] AS people,
        NULL AS people_len,
        contacts.brand,
        NULL::text AS status,
        jsonb_build_object(
          'is_partner', is_partner
        ) AS metadata
      FROM
        contacts
        JOIN contacts_attributes AS ca
          ON contacts.id = ca.contact
        JOIN contacts_attribute_defs AS cad
          ON ca.attribute_def = cad.id
      WHERE
        contacts.deleted_at IS NULL
        AND ca.deleted_at IS NULL
        AND cad.deleted_at IS NULL
        AND data_type = 'date'
    )
    UNION ALL
    (
      SELECT
        id,
        created_by,
        'contact' AS object_type,
        'next_touch' AS event_type,
        'Next Touch' AS type_label,
        next_touch AS "timestamp",
        next_touch AS "date",
        next_touch AS next_occurence,
        NULL::timestamptz AS end_date,
        False AS recurring,
        display_name AS title,
        NULL::uuid AS crm_task,
        NULL::uuid AS deal,
        id AS contact,
        NULL::uuid AS campaign,
        NULL::uuid AS credential_id,
        NULL::text AS thread_key,
        ARRAY[contacts."user"] AS users,
        NULL::uuid[] AS people,
        NULL AS people_len,
        brand,
        NULL::text AS status,
        NULL::jsonb AS metadata
      FROM
        contacts
      WHERE
        deleted_at IS NULL
        AND next_touch IS NOT NULL
    )
    UNION ALL
    (
      SELECT
        id,
        created_by,
        'email_campaign' AS object_type,
        'scheduled_email' AS event_type,
        'Scheduled Email' AS type_label,
        due_at AS "timestamp",
        due_at AS "date",
        due_at AS next_occurence,
        NULL::timestamptz AS end_date,
        False AS recurring,
        subject AS title,
        NULL::uuid AS crm_task,
        ec.deal,
        NULL::uuid AS contact,
        id AS campaign,
        NULL::uuid AS credential_id,
        NULL::text AS thread_key,
        ARRAY[ec.from] AS users,
  
        (
          SELECT
            ARRAY_AGG(contact)
          FROM
            (
              SELECT
                contact
              FROM
                email_campaigns_recipient_emails AS ecr
              WHERE
                campaign = ec.id
              LIMIT 5
            ) t
        ) AS people,
  
        (
          SELECT
            COUNT(DISTINCT email)
          FROM
            email_campaigns_recipient_emails AS ecr
          WHERE
            campaign = ec.id
        ) AS people_len,
  
        brand,
        NULL::text AS status,
        NULL::jsonb AS metadata
      FROM
        email_campaigns AS ec
      WHERE
        deleted_at IS NULL
        AND executed_at IS NULL
        AND due_at IS NOT NULL
    )
    UNION ALL
    (
      SELECT
        ec.id,
        ec.created_by,
        'email_campaign' AS object_type,
        'executed_email' AS event_type,
        'Executed Email' AS type_label,
        executed_at AS "timestamp",
        executed_at AS "date",
        executed_at AS next_occurence,
        NULL::timestamptz AS end_date,
        False AS recurring,
        subject AS title,
        NULL::uuid AS crm_task,
        ec.deal,
        NULL::uuid AS contact,
        id AS campaign,
        NULL::uuid AS credential_id,
        NULL::text AS thread_key,
        ARRAY[ec.from] AS users,
  
        (
          SELECT
            ARRAY_AGG(contact)
          FROM
            (
              SELECT
                contact
              FROM
                email_campaign_emails AS ece
                JOIN contacts AS c
                  ON c.email @> ARRAY[ece.email_address]
              WHERE
                ece.campaign = ec.id
                AND c.brand = ec.brand
                AND c.deleted_at IS NULL
              LIMIT 5
            ) t
        ) AS people,
  
        brand,
        NULL::text AS status,
        NULL::jsonb AS metadata
      FROM
        email_campaigns AS ec
      WHERE
        deleted_at IS NULL
        AND executed_at IS NOT NULL
        AND due_at IS NOT NULL
    )
    UNION ALL
    (
      SELECT
        ec.id,
        ec.created_by,
        'email_campaign_recipient' AS object_type,
        'scheduled_email' AS event_type,
        'Scheduled Email' AS type_label,
        ec.due_at AS "timestamp",
        ec.due_at AS "date",
        ec.due_at AS next_occurence,
        NULL::timestamptz AS end_date,
        False AS recurring,
        ec.subject AS title,
        NULL::uuid AS crm_task,
        ec.deal,
        ecr.contact,
        ec.id AS campaign,
        NULL::uuid AS credential_id,
        NULL::text AS thread_key,
        ARRAY[ec.from] AS users,
        (
          SELECT
            ARRAY_AGG(contact)
          FROM
            (
              SELECT
                contact
              FROM
                email_campaigns_recipient_emails
              WHERE
                campaign = ec.id
              LIMIT 5
            ) t
        ) AS people,
        (
          SELECT
            COUNT(DISTINCT email)
          FROM
            email_campaigns_recipient_emails
          WHERE
            campaign = ec.id
        ) AS people_len,
        ec.brand,
        NULL::text AS status,
        NULL::jsonb AS metadata
      FROM
        email_campaigns AS ec
        JOIN email_campaigns_recipient_emails AS ecr
          ON ec.id = ecr.campaign
      WHERE
        ec.deleted_at IS NULL
        AND ec.executed_at IS NULL
        AND ec.due_at IS NOT NULL
    )
    UNION ALL
    (
      SELECT
        ec.id,
        ec.created_by,
        'email_campaign_recipient' AS object_type,
        'executed_email' AS event_type,
        'Executed Email' AS type_label,
        executed_at AS "timestamp",
        executed_at AS "date",
        executed_at AS next_occurence,
        NULL::timestamptz AS end_date,
        False AS recurring,
        subject AS title,
        NULL::uuid AS crm_task,
        ec.deal,
        c.id AS contact,
        ec.id AS campaign,
        NULL::uuid AS credential_id,
        NULL::text AS thread_key,
        ARRAY[ec.from] AS users,
  
        (
          SELECT
            ARRAY_AGG(contact)
          FROM
            (
              SELECT
                contact
              FROM
                email_campaign_emails
                JOIN contacts
                  ON contacts.email @> ARRAY[email_campaign_emails.email_address]
              WHERE
                email_campaign_emails.campaign = ec.id
                AND contacts.brand = ec.brand
                AND contacts.deleted_at IS NULL
              LIMIT 5
            ) t
        ) AS people,
  
        ec.brand,
        NULL::text AS status,
        NULL::jsonb AS metadata
      FROM
        email_campaigns AS ec
        JOIN email_campaign_emails AS ece
          ON ece.campaign = ec.id
        JOIN contacts c
          ON (c.brand = ec.brand AND ec.id = ece.campaign)
      WHERE
        ec.deleted_at IS NULL
        AND c.deleted_at IS NULL
        AND c.email @> ARRAY[ece.email_address]
        AND ec.executed_at IS NOT NULL
    )
    UNION ALL
    (
      SELECT
        DISTINCT ON (google_credentials.brand, google_messages.thread_key, contact, object_type, event_type, recurring)
        google_messages.id,
        google_credentials.user AS created_by,
        'email_thread' AS object_type,
        'gmail' AS event_type,
        'Email Thread' AS type_label,
        message_date AS "timestamp",
        message_date AS "date",
        message_date AS next_occurence,
        NULL::timestamptz AS end_date,
        False AS recurring,
        COALESCE(subject, '') AS "title",
        NULL::uuid AS crm_task,
        NULL::uuid AS deal,
        NULL::uuid AS contact,
        NULL::uuid AS campaign,
        google_messages.google_credential AS credential_id,
        thread_key,
        ARRAY[google_credentials."user"] AS users,
  
        NULL::uuid[] AS people,
        0 AS people_len,
  
        google_credentials.brand,
        NULL::text AS status,
        NULL::jsonb AS metadata
      FROM
        google_messages
        JOIN google_credentials
          ON google_messages.google_credential = google_credentials.id
      WHERE
        google_messages.deleted_at IS NULL
      ORDER BY google_credentials.brand, google_messages.thread_key, contact, object_type, event_type, recurring, message_date ASC
    )
    UNION ALL
    (
      SELECT
        DISTINCT ON (microsoft_credentials.brand, microsoft_messages.thread_key, contact, object_type, event_type, recurring)
        microsoft_messages.id,
        microsoft_credentials.user AS created_by,
        'email_thread' AS object_type,
        'outlook' AS event_type,
        'Email Thread' AS type_label,
        message_date AS "timestamp",
        message_date AS "date",
        message_date AS next_occurence,
        NULL::timestamptz AS end_date,
        False AS recurring,
        COALESCE(subject, '') AS "title",
        NULL::uuid AS crm_task,
        NULL::uuid AS deal,
        NULL::uuid AS contact,
        NULL::uuid AS campaign,
        microsoft_messages.microsoft_credential AS credential_id,
        thread_key,
        ARRAY[microsoft_credentials."user"] AS users,
  
        NULL::uuid[] AS people,
        0 AS people_len,
  
        microsoft_credentials.brand,
        NULL::text AS status,
        NULL::jsonb AS metadata
      FROM
        microsoft_messages
      JOIN
        microsoft_credentials on microsoft_messages.microsoft_credential = microsoft_credentials.id
      WHERE
        microsoft_messages.deleted_at IS NULL
      ORDER BY microsoft_credentials.brand, microsoft_messages.thread_key, contact, object_type, event_type, recurring, message_date ASC
    )
    UNION ALL
    (
      SELECT
        DISTINCT ON (google_credentials.brand, google_messages.thread_key, contact, object_type, event_type, recurring)
        google_messages.id,
        google_credentials.user AS created_by,
        'email_thread_recipient' AS object_type,
        'gmail' AS event_type,
        'Email Thread' AS type_label,
        message_date AS "timestamp",
        message_date AS "date",
        message_date AS next_occurence,
        NULL::timestamptz AS end_date,
        False AS recurring,
        COALESCE(subject, '') AS "title",
        NULL::uuid AS crm_task,
        NULL::uuid AS deal,
        c.id AS contact,
        NULL::uuid AS campaign,
        google_messages.google_credential AS credential_id,
        thread_key,
        ARRAY[google_credentials."user"] AS users,
  
        NULL::uuid[] AS people,
        0 AS people_len,
  
        google_credentials.brand,
        NULL::text AS status,
        NULL::jsonb AS metadata
      FROM
        google_messages
        CROSS JOIN LATERAL (
          SELECT
            contacts.id
          FROM
            contacts
          WHERE
            contacts.email && google_messages.recipients
        ) AS c
        JOIN google_credentials ON google_messages.google_credential = google_credentials.id
      WHERE
        google_messages.deleted_at IS NULL
      ORDER BY google_credentials.brand, google_messages.thread_key, contact, object_type, event_type, recurring, message_date ASC
    )
    UNION ALL
    (
      SELECT
        DISTINCT ON (microsoft_credentials.brand, microsoft_messages.thread_key, contact, object_type, event_type, recurring)
        microsoft_messages.id,
        microsoft_credentials.user AS created_by,
        'email_thread_recipient' AS object_type,
        'outlook' AS event_type,
        'Email Thread' AS type_label,
        message_date AS "timestamp",
        message_date AS "date",
        message_date AS next_occurence,
        NULL::timestamptz AS end_date,
        False AS recurring,
        COALESCE(subject, '') AS "title",
        NULL::uuid AS crm_task,
        NULL::uuid AS deal,
        c.id AS contact,
        NULL::uuid AS campaign,
        microsoft_messages.microsoft_credential AS credential_id,
        thread_key,
        ARRAY[microsoft_credentials."user"] AS users,
  
        NULL::uuid[] AS people,
        0 AS people_len,
  
        microsoft_credentials.brand,
        NULL::text AS status,
        NULL::jsonb AS metadata
      FROM
        microsoft_messages
        CROSS JOIN LATERAL (
          SELECT
            contacts.id
          FROM
            contacts
          WHERE
            contacts.email && microsoft_messages.recipients
        ) AS c
        JOIN microsoft_credentials ON microsoft_messages.microsoft_credential = microsoft_credentials.id
      WHERE
        microsoft_messages.deleted_at IS NULL
      ORDER BY microsoft_credentials.brand, microsoft_messages.thread_key, contact, object_type, event_type, recurring, message_date ASC
    )
  )`,
  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
