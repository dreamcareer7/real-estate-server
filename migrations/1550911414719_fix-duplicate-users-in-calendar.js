const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE OR REPLACE VIEW analytics.calendar AS (
    SELECT
      id,
      created_by,
      'crm_task' AS object_type,
      task_type AS event_type,
      task_type AS type_label,
      due_date AS "timestamp",
      False AS recurring,
      title,
      id AS crm_task,
      NULL::uuid AS deal,
      NULL::uuid AS contact,
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
      status
    FROM
      crm_tasks
    WHERE
      deleted_at IS NULL
    )
    UNION ALL
    (
      SELECT
        cdc.id,
        deals.created_by,
        'deal_context' AS object_type,
        cdc."key" AS event_type,
        bc.label AS type_label,
        timezone('UTC', date_trunc('day', cdc."date")) AT TIME ZONE 'UTC' AS "timestamp",
        False AS recurring,
        deals.title,
        NULL::uuid AS crm_task,
        cdc.deal,
        NULL::uuid AS contact,
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
        NULL::text AS status
      FROM
        current_deal_context cdc
        JOIN deals
          ON cdc.deal = deals.id
        JOIN deal_context dc
          ON dc.id = cdc.id
        JOIN brands_contexts bc
          ON bc.id = dc.definition
        JOIN deals_checklists dcl
          ON dcl.deal = deals.id
      WHERE
        deals.deleted_at IS NULL
        AND cdc.data_type = 'Date'::context_data_type
        AND dcl.deleted_at     IS NULL
        AND dcl.deactivated_at IS NULL
        AND dcl.terminated_at  IS NULL
        AND deals.faired_at    IS NOT NULL
        AND deal_status_mask(deals.id, '{Withdrawn,Cancelled,"Contract Terminated"}') IS NOT FALSE
    )
    UNION ALL
    (
      SELECT
        ca.id,
        contacts.created_by,
        'contact_attribute' AS object_type,
        COALESCE(cad.name, cad.label) AS event_type,
        (CASE
          WHEN attribute_type = 'birthday' THEN 'Birthday'
          WHEN attribute_type = 'child_birthday' THEN COALESCE('Child Birthday (' || ca.label || ')', 'Child Birthday')
          WHEN attribute_type = 'important_date' THEN COALESCE(ca.label, 'Important Date')
          ELSE COALESCE(cad.label, cad.name)
        END) AS type_label,
        timezone('UTC', date_trunc('day', "date")::timestamp) AT TIME ZONE 'UTC' AS "timestamp",
        True AS recurring,
        (CASE WHEN ca.is_partner IS TRUE THEN contacts.partner_name ELSE contacts.display_name END) AS title,
        NULL::uuid AS crm_task,
        NULL::uuid AS deal,
        contact,
        ARRAY[contacts."user"] AS users,
        contacts.brand,
        NULL::text AS status
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
  `,
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
