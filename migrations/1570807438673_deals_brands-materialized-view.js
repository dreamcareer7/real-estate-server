const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE MATERIALIZED VIEW IF NOT EXISTS deals_brands AS (
    (
      SELECT
        d.id AS deal,
        bp.brand
      FROM
        deals d,
        brand_parents(d.brand) bp(brand)
      WHERE
        d.deleted_at IS NULL
    ) UNION (
      SELECT
        deals.id AS deal,
        bp.brand
      FROM
        deals
        LEFT JOIN deals_roles
          ON deals.id = deals_roles.deal
        LEFT JOIN deals_checklists
          ON deals_roles.checklist = deals_checklists.id
        CROSS JOIN LATERAL brand_parents(deals_roles.brand) bp(brand)
      WHERE
        deals_roles.brand IS NOT NULL
        AND deals_roles.deleted_at IS NULL
        AND deals_checklists.deactivated_at IS NULL
        AND deals_checklists.terminated_at IS NULL
    )
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS deals_brands_unique_idx ON deals_brands (deal, brand)',
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
      JOIN deals_brands AS dba
        ON ((dr.deal = dba.deal) AND (dba.brand = c.brand))
    WHERE c.deleted_at IS NULL
      AND dr.deleted_at IS NULL
  )`,
  'DROP VIEW deal_brand_access',
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
