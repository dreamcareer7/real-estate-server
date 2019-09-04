const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE crm_tags ADD COLUMN IF NOT EXISTS touch_freq integer',

  `CREATE OR REPLACE FUNCTION get_touch_times_for_contacts(uuid[])
    RETURNS TABLE (
      contact uuid,
      last_touch timestamptz,
      next_touch timestamptz
    )
    LANGUAGE SQL
    AS $$
      WITH last_touches AS (
        SELECT DISTINCT ON (ca.contact)
          ca.contact,
          crm_tasks.due_date AS last_touch
        FROM
          crm_tasks
          JOIN crm_associations AS ca
            ON ca.crm_task = crm_tasks.id
        WHERE
          ca.contact = ANY($1)
          AND crm_tasks.status = 'DONE'
          AND crm_tasks.task_type <> ALL(ARRAY['Note', 'Other'])
          AND crm_tasks.deleted_at IS NULL
          AND ca.deleted_at IS NULL
        ORDER BY
          ca.contact, crm_tasks.due_date desc
      ),
      touch_freqs AS (
        (
          SELECT
            cids.id,
            touch_freq
          FROM
            unnest($1::uuid[]) AS cids(id)
            JOIN crm_lists_members AS clm
              ON cids.id = clm.contact
            JOIN crm_lists AS csl
              ON csl.id = clm.list
          WHERE
            touch_freq IS NOT NULL
            AND clm.deleted_at IS NULL
            AND csl.deleted_at IS NULL
        ) UNION ALL (
          SELECT
            cids.id,
            touch_freq
          FROM
            unnest($1::uuid[]) AS cids(id)
            JOIN contacts AS c
              ON cids.id = c.id
            CROSS JOIN LATERAL unnest(c.tag) AS t(tag)
            LEFT JOIN crm_tags AS ct
              ON (ct.tag = t.tag)
          WHERE
            touch_freq IS NOT NULL
            AND ct.brand = c.brand
            AND ct.deleted_at IS NULL
        )
      ),
      next_touches AS (
        SELECT
          cids.id AS contact,
          MIN(COALESCE(last_touch, NOW()) + (touch_freq || ' days')::interval) AS next_touch
        FROM
          unnest($1::uuid[]) AS cids(id)
          JOIN touch_freqs AS tf
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
