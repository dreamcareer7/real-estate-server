const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE OR REPLACE VIEW calendar.holiday AS (
    SELECT
      id::text,
      created_at,
      updated_at,
      deleted_at,
      deleted_at AS parent_deleted_at,
      GREATEST(created_at, updated_at, deleted_at) AS last_updated_at,
      'holiday' AS object_type,
      name AS event_type,
      name AS type_label,
      starts_at AS "timestamp",
      starts_at::date AS "date",
      starts_at AS next_occurence,
      False AS recurring,
      name AS title,
      True AS all_day,
      NULL::uuid AS created_by,
      NULL::uuid AS crm_task,
      NULL::text AS end_date,
      NULL::uuid AS deal,
      NULL::uuid AS contact,
      NULL::uuid AS campaign,
      NULL::uuid AS credential_id,
      NULL::text AS thread_key,
      NULL::uuid AS activity,
      NULL::uuid AS showing,
      NULL::uuid AS flow,
      NULL::uuid[] users,
      NULL::uuid[] AS accessible_to,
      NULL::uuid[] AS people,
      NULL::INT AS people_len,
      NULL::uuid AS brand,
      NULL::text AS status,
      NULL::jsonb AS metadata
    FROM
      holidays AS h
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
