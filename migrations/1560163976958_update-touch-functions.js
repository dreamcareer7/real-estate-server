const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'DROP FUNCTION get_last_touch_for_contacts(uuid[])',
  'DROP FUNCTION get_next_touch_for_contacts(uuid[])',
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
      next_touches AS (
        SELECT
          last_touches.contact,
          MIN(COALESCE(last_touch, NOW()) + (touch_freq || ' days')::interval) AS next_touch
        FROM
          last_touches
          JOIN unnest($1::uuid[]) AS cids(id)
            ON last_touches.contact = cids.id
          JOIN crm_lists_members AS clm
            ON last_touches.contact = clm.contact
          JOIN crm_lists AS csl
            ON csl.id = clm.list
        WHERE
          clm.deleted_at IS NULL
          AND csl.deleted_at IS NULL
          AND touch_freq IS NOT NULL
        GROUP BY
          last_touches.contact
      )
      SELECT
        lt.contact,
        lt.last_touch,
        nt.next_touch
      FROM
        last_touches AS lt
        JOIN next_touches AS nt USING (contact)
    $$  
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
