const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'DROP VIEW analytics.calendar',

  `CREATE OR REPLACE VIEW analytics.calendar AS (
    SELECT
      id,
      created_by,
      'crm_task' AS object_type,
      task_type AS event_type,
      task_type AS type_label,
      due_date AS "timestamp",
      due_date AS "date",
      due_date AS next_occurence,
      False AS recurring,
      title,
      id AS crm_task,
      NULL::uuid AS deal,
      NULL::uuid AS contact,
      NULL::uuid AS campaign,
      (
        SELECT
          ARRAY_AGG("user")
        FROM
          crm_tasks_assignees
        WHERE
          crm_task = crm_tasks.id
          AND deleted_at IS NULL
      ) AS users,
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
      ct.due_date AS next_occurence,
      False AS recurring,
      ct.title,
      ct.id AS crm_task,
      ca.deal,
      ca.contact,
      ca.email AS campaign,
      (
        SELECT
          ARRAY_AGG("user")
        FROM
          crm_tasks_assignees
        WHERE
          crm_task = ct.id
          AND deleted_at IS NULL
      ) AS users,
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
        False AS recurring,
        deals.title,
        NULL::uuid AS crm_task,
        cdc.deal,
        NULL::uuid AS contact,
        NULL::uuid AS campaign,
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
        deals.brand,
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
        ARRAY[contacts."user"] AS users,
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
        False AS recurring,
        display_name AS title,
        NULL::uuid AS crm_task,
        NULL::uuid AS deal,
        id AS contact,
        NULL::uuid AS campaign,
        ARRAY[contacts."user"] AS users,
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
        False AS recurring,
        subject AS title,
        NULL::uuid AS crm_task,
        NULL::uuid AS deal,
        NULL::uuid AS contact,
        id AS campaign,
        ARRAY[email_campaigns.from] AS users,
        brand,
        NULL::text AS status,
        NULL::jsonb AS metadata
      FROM
        email_campaigns
      WHERE
        deleted_at IS NULL
        AND executed_at IS NULL
        AND deleted_at IS NULL
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
        False AS recurring,
        ec.subject AS title,
        NULL::uuid AS crm_task,
        NULL::uuid AS deal,
        ecr.contact,
        ec.id AS campaign,
        ARRAY[ec.from] AS users,
        ec.brand,
        NULL::text AS status,
        NULL::jsonb AS metadata
      FROM
        email_campaigns AS ec
        JOIN (
          (
            SELECT
              ecr.campaign,
              clm.contact
            FROM
              email_campaigns_recipients AS ecr
              JOIN crm_lists_members AS clm
                ON ecr.list = clm.list
          )
          UNION
          (
            SELECT
              ecr.campaign,
              cs.id AS contact
            FROM
              email_campaigns_recipients AS ecr
              JOIN email_campaigns AS ec
                ON ecr.campaign = ec.id
              JOIN contacts_summaries AS cs
                ON ARRAY[ecr.tag] <@ cs.tag AND ec.brand = cs.brand
            WHERE
              ecr.tag IS NOT NULL
          )
          UNION
          (
            SELECT
              campaign,
              contact
            FROM
              email_campaigns_recipients
            WHERE
              contact IS NOT NULL
          )
        ) AS ecr
          ON ec.id = ecr.campaign
    )`,

  'COMMIT'
]


const run = async () => {
  const conn = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
