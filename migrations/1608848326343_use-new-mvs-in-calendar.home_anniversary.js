const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE OR REPLACE VIEW calendar.home_anniversary AS (
    SELECT
      c.contact::text || ':' || cdc.id::text AS id,
      cdc.created_by,
      cdc.created_at,
      cdc.created_at AS updated_at,
      cdc.deleted_at,
      NULL::timestamptz AS parent_deleted_at,
      GREATEST(cdc.created_at, cdc.deleted_at) AS last_updated_at,
      'deal_context' AS object_type,
      'home_anniversary' AS event_type,
      'Home Anniversary' AS type_label,
      cdc."date" AS "timestamp",
      (timezone('UTC', date_trunc('day', cdc."date")) AT TIME ZONE 'UTC')::date AS "date",
      cast(cdc."date" + ((extract(year from age(cdc."date")) + 1) * interval '1 year') as date) AS next_occurence,
      NULL::timestamptz AS end_date,
      TRUE AS recurring,
      cdc.title,
      NULL::uuid AS crm_task,
      TRUE as all_day,
      cdc.deal,
      c.contact,
      NULL::uuid AS campaign,
      NULL::uuid AS credential_id,
      NULL::text AS thread_key,
      NULL::uuid AS activity,
      NULL::uuid AS flow,
      (
        SELECT
          ARRAY_AGG(DISTINCT r."user")
        FROM
          deals_roles AS r
        WHERE
          r.deal = cdc.deal
          AND r.deleted_at IS NULL
          AND r."user" IS NOT NULL
      ) AS users,
      NULL::uuid[] AS accessible_to,
      ARRAY[json_build_object(
        'id', c.contact,
        'type', 'contact'
      )] AS people,
      1 AS people_len,
      cdc.brand,
      NULL::text AS status,
      NULL::jsonb AS metadata
    FROM
      contacts_emails AS c
      JOIN calendar.deals_closed_buyers AS cdc
        ON cdc.email = c.email
    WHERE
      c.brand = cdc.brand
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
