const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE OR REPLACE VIEW contacts_roles AS (
    SELECT
      dba.brand,
      c.id AS contact,
      dr.deal,
      dr.id AS "role",
      dr.role AS role_name
    FROM
      contacts AS c
      JOIN deals_roles AS dr
        ON ((c.email @> ARRAY[dr.email]) OR (c.phone_number @> ARRAY[dr.phone_number]))
      JOIN deal_brand_access AS dba
        ON ((dr.deal = dba.deal) AND (dba.brand = c.brand))
    WHERE c.deleted_at IS NULL
      AND dr.deleted_at IS NULL
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
