const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'DROP VIEW triggers_due',
  'DROP VIEW analytics.calendar',
  'DROP VIEW calendar.flow',
  'ALTER TABLE flows ALTER last_step_date type date',
  `CREATE OR REPLACE VIEW calendar.flow AS (
    SELECT
      id::text,
      created_by,
      created_at,
      updated_at,
      deleted_at,
      NULL::timestamptz AS parent_deleted_at,
      GREATEST(created_at, updated_at, deleted_at) AS last_updated_at,
      'flow' AS object_type,
      'last_step_date' AS event_type,
      'Last Step Date' AS type_label,
      last_step_date AS "timestamp",
      last_step_date::date AS "date",
      last_step_date::date as next_occurence,
      NULL::timestamptz AS end_date,
      False AS recurring,
      name::text AS title,
      NULL::uuid AS crm_task,
      TRUE AS all_day,
      NULL::uuid AS deal,
      contact,
      NULL::uuid AS campaign,
      NULL::uuid AS credential_id,
      NULL::text AS thread_key,
      NULL::uuid AS activity,
      NULL::uuid AS showing,
      id AS flow,
      ARRAY[created_by] AS users,
      NULL::uuid[] AS accessible_to,
      NULL::json[] AS people,
      0 AS people_len,
      brand,
      NULL::text AS status,
      NULL::jsonb AS metadata
    FROM
      flows
    WHERE
      flows.deleted_at IS NULL
  )`,
  `CREATE OR REPLACE VIEW analytics.calendar AS (
    (
      SELECT * FROM calendar.activity
    )
    UNION ALL
    (
      SELECT * FROM calendar.contact
    )
    UNION ALL
    (
      SELECT * FROM calendar.contact_attribute
    )
    UNION ALL
    (
      SELECT * FROM calendar.crm_association
    )
    UNION ALL
    (
      SELECT * FROM calendar.crm_task
    )
    UNION ALL
    (
      SELECT * FROM calendar.deal_context
    )
    UNION ALL
    (
      SELECT * FROM calendar.email_campaign_email_executed
    )
    UNION ALL
    (
      SELECT * FROM calendar.email_campaign_executed
    )
    UNION ALL
    (
      SELECT * FROM calendar.email_campaign_scheduled
    )
    UNION ALL
    (
      SELECT * FROM calendar.email_thread
    )
    UNION ALL
    (
      SELECT * FROM calendar.email_thread_recipient
    )
    UNION ALL
    (
      SELECT * FROM calendar.flow
    )
    UNION ALL
    (
      SELECT * FROM calendar.home_anniversary
    )
    UNION ALL
    (
      SELECT * FROM calendar.showing
    )
  )`,
  `CREATE OR REPLACE VIEW triggers_due AS (
    (
      SELECT
        t.*,
        'contact' AS trigger_object_type,
        c.object_type,
        (c.next_occurence AT TIME ZONE 'UTC' AT TIME ZONE u.timezone) + t.wait_for + t.time AS timestamp,
        (c.next_occurence AT TIME ZONE 'UTC' AT TIME ZONE u.timezone) + t.wait_for + t.time - interval '3 days' AS due_at
      FROM
        triggers AS t
        JOIN calendar.contact_attribute AS c
          ON t.contact = c.contact
        JOIN users AS u
          ON (t.user = u.id)
      WHERE
        c.brand = t.brand
        AND t.contact IS NOT NULL
        AND t.event_type = c.event_type
        AND t.executed_at IS NULL
        AND t.effective_at <= NOW()
        AND t.failed_at IS NULL
        AND t.deleted_at IS NULL
    )
    UNION ALL
    (
      SELECT
        t.*,
        'deal' AS trigger_object_type,
        c.object_type,
        (c.next_occurence AT TIME ZONE 'UTC' AT TIME ZONE u.timezone) + t.wait_for + t.time AS timestamp,
        (c.next_occurence AT TIME ZONE 'UTC' AT TIME ZONE u.timezone) + t.wait_for + t.time - interval '3 days' AS due_at
      FROM
        triggers AS t
        JOIN calendar.deal_context AS c
          ON t.deal = c.deal
        JOIN users AS u
          ON (t.user = u.id)
      WHERE
        c.brand = t.brand
        AND t.deal IS NOT NULL
        AND t.event_type = c.event_type
        AND t.executed_at IS NULL
        AND t.effective_at <= NOW()
        AND t.failed_at IS NULL
        AND t.deleted_at IS NULL
    )
    UNION ALL
    (
      SELECT
        t.*,
        (CASE WHEN t.contact IS NOT NULL THEN 'contact' WHEN t.deal IS NOT NULL THEN 'deal' ELSE NULL END) AS trigger_object_type,
        c.object_type,
        (c.next_occurence AT TIME ZONE 'UTC' AT TIME ZONE u.timezone) + t.wait_for + t.time AS timestamp,
        (c.next_occurence AT TIME ZONE 'UTC' AT TIME ZONE u.timezone) + t.wait_for + t.time - interval '3 days' AS due_at
      FROM
        triggers AS t
        JOIN calendar.flow AS c
          ON (t.deal = c.deal OR t.contact = c.contact)
        JOIN users AS u
          ON (t.user = u.id)
      WHERE
        c.brand = t.brand
        AND c.event_type = 'last_step_date'
        AND t.event_type = 'last_step_date'
        AND t.deleted_at IS NULL
        AND t.executed_at IS NULL
        AND t.effective_at <= NOW()
        AND t.failed_at IS NULL
        AND t.flow = c.id::uuid
    )
    UNION ALL
    (
      SELECT
        t.*,
        'holiday' AS trigger_object_type,
        c.object_type,
        (c.next_occurence AT TIME ZONE 'UTC' AT TIME ZONE u.timezone) + t.wait_for + t.time AS timestamp,
        (c.next_occurence AT TIME ZONE 'UTC' AT TIME ZONE u.timezone) + t.wait_for + t.time - interval '3 days' AS due_at
      FROM
        triggers AS t
        JOIN calendar.holiday AS c
          ON t.event_type = c.event_type
        JOIN users AS u
          ON (t.user = u.id)
      WHERE
        t.contact IS NULL
        AND t.deal IS NULL
        AND t.deleted_at IS NULL
        AND t.executed_at IS NULL
        AND t.effective_at <= NOW()
        AND t.failed_at IS NULL
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
