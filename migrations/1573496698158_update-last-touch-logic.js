const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE OR REPLACE VIEW crm_last_touches AS (
    SELECT
      contact,
      MAX(timestamp) AS last_touch
    FROM
      (
        (
          SELECT
            ca.contact,
            ct.due_date AS "timestamp"
          FROM
            crm_associations AS ca
            JOIN crm_tasks AS ct
              ON ca.crm_task = ct.id
          WHERE
            ca.deleted_at IS NULL
            AND ct.deleted_at IS NULL
            AND ct.task_type <> ALL('{Note,Other}')
        ) UNION ALL (
          SELECT
            c.id,
            last_message_date AS "timestamp"
          FROM
            microsoft_threads
            JOIN microsoft_credentials
              ON microsoft_threads.microsoft_credential = microsoft_credentials.id
            CROSS JOIN LATERAL (
              SELECT
                contacts.id
              FROM
                contacts
              WHERE
                contacts.email && microsoft_threads.recipients
                AND contacts.brand = microsoft_credentials.brand
            ) AS c
        ) UNION ALL (
          SELECT
            c.id,
            last_message_date AS "timestamp"
          FROM
            google_threads
            JOIN google_credentials
              ON google_threads.google_credential = google_credentials.id
            CROSS JOIN LATERAL (
              SELECT
                contacts.id
              FROM
                contacts
              WHERE
                contacts.email && google_threads.recipients
                AND contacts.brand = google_credentials.brand
            ) AS c
        ) UNION ALL (
          SELECT
            c.id AS contact,
            executed_at AS "timestamp"
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
    WHERE
      "timestamp" <= NOW()
    GROUP BY
      contact
  )`,

  `CREATE OR REPLACE FUNCTION get_touch_times_for_contacts(uuid[])
  RETURNS TABLE (
    contact uuid,
    last_touch timestamptz,
    next_touch timestamptz
  )
  LANGUAGE SQL
  AS $$
    WITH last_touches AS (
      SELECT
        contact,
        last_touch
      FROM
        crm_last_touches
      WHERE
        contact = ANY($1)
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
