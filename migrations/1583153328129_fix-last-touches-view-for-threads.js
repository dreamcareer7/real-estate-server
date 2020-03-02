const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE OR REPLACE VIEW crm_last_touches AS (
    SELECT DISTINCT ON (contact)
      contact,
      max(timestamp) OVER (PARTITION BY contact) AS last_touch,
      action,
      reference
    FROM
      (
        (
          SELECT
            ca.contact,
            ct.due_date AS "timestamp",
            ct.task_type AS action,
            ct.id AS reference
          FROM
            crm_associations AS ca
            JOIN crm_tasks AS ct
              ON ca.crm_task = ct.id
          WHERE
            ca.deleted_at IS NULL
            AND ct.deleted_at IS NULL
            AND ct.task_type <> ALL('{Note,Other}')
            AND ct.due_date <= NOW()
        ) UNION ALL (
          SELECT
            c.id,
            message_date AS "timestamp",
            'email' AS action,
            google_messages.id AS reference
          FROM
            google_messages
            JOIN google_credentials
              ON google_messages.google_credential = google_credentials.id
            CROSS JOIN LATERAL (
              SELECT
                contacts.id
              FROM
                contacts
              WHERE
                contacts.email && google_messages.recipients
                AND contacts.brand = google_credentials.brand
                AND contacts.deleted_at IS NULL
                AND google_messages.deleted_at IS NULL
            ) AS c
          WHERE
            google_credentials.deleted_at IS NULL
            AND google_credentials.revoked IS NOT TRUE
        ) UNION ALL (
          SELECT
            c.id,
            message_date AS "timestamp",
            'email' AS action,
            microsoft_messages.id AS reference
          FROM
            microsoft_messages
            JOIN microsoft_credentials
              ON microsoft_messages.microsoft_credential = microsoft_credentials.id
            CROSS JOIN LATERAL (
              SELECT
                contacts.id
              FROM
                contacts
              WHERE
                contacts.email && microsoft_messages.recipients
                AND contacts.brand = microsoft_credentials.brand
                AND contacts.deleted_at IS NULL
                AND microsoft_messages.deleted_at IS NULL
            ) AS c
          WHERE
            microsoft_credentials.deleted_at IS NULL
            AND microsoft_credentials.revoked IS NOT TRUE
        ) UNION ALL (
          SELECT
            c.id AS contact,
            executed_at AS "timestamp",
            'email' AS action,
            ec.id AS reference
          FROM
            email_campaigns AS ec
            JOIN email_campaign_emails AS ece
              ON ece.campaign = ec.id
            JOIN contacts c
              ON (c.brand = ec.brand)
          WHERE
            ec.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND c.email && ARRAY[ece.email_address]
            AND ec.executed_at IS NOT NULL
        )
      ) AS touches
    ORDER BY
      contact,
      timestamp DESC
  )`,

  'ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_touch_action text',

  `UPDATE
    contacts
  SET
    last_touch = clt.last_touch,
    last_touch_action = clt.action
  FROM
    crm_last_touches AS clt
  WHERE
    contacts.brand IS NOT NULL
    AND contacts.deleted_at IS NULL
    AND clt.contact = contacts.id
  `,

  'DROP FUNCTION get_touch_times_for_contacts(uuid[])',
  `CREATE OR REPLACE FUNCTION get_touch_times_for_contacts(uuid[])
    RETURNS TABLE (
      contact uuid,
      last_touch timestamptz,
      last_touch_action text,
      next_touch timestamptz
    )
    LANGUAGE SQL
    AS $$
      WITH last_touches AS (
        SELECT
          cids.id AS contact,
          last_touch,
          action AS last_touch_action
        FROM
          unnest($1::uuid[]) AS cids(id)
          LEFT JOIN crm_last_touches clt
            ON cids.id = clt.contact
      ),
      next_touches AS (
        SELECT
          cids.id AS contact,
          MIN(COALESCE(last_touch, NOW()) + (touch_freq || ' days')::interval) AS next_touch
        FROM
          unnest($1::uuid[]) AS cids(id)
          JOIN get_contact_touch_freqs($1::uuid[]) AS tf
            ON cids.id = tf.id
          LEFT JOIN last_touches
            ON last_touches.contact = cids.id
        GROUP BY
          cids.id
      )
      SELECT
        cids.id AS contact,
        lt.last_touch,
        lt.last_touch_action,
        nt.next_touch
      FROM
        unnest($1::uuid[]) AS cids(id)
        LEFT JOIN last_touches AS lt
          ON cids.id = lt.contact
        LEFT JOIN next_touches AS nt
          ON cids.id = nt.contact
    $$`,

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
