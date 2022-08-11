const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'DROP VIEW IF EXISTS triggers_due',
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
