const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `CREATE MATERIALIZED VIEW calendar.deals_buyers AS (
    SELECT
      d.id AS deal,
      d.title,
      dr.id AS role,
      dr.email,
      dr.phone_number,
      db.brand,
      dcl.id AS checklist
    FROM
      deals_checklists dcl
      JOIN deals d ON d.id = dcl.deal
      JOIN deals_brands db ON db.deal = d.id
      JOIN deals_roles dr ON dr.deal = d.id
    WHERE
      d.deleted_at IS NULL
      AND d.faired_at IS NOT NULL
      AND d.deal_type = 'Buying'::deal_type
      AND dcl.deleted_at IS NULL
      AND dcl.deactivated_at IS NULL
      AND dcl.terminated_at IS NULL
      AND dr.deleted_at IS NULL
      AND dr.role = 'Buyer'::deal_role
  )`,

  `CREATE MATERIALIZED VIEW calendar.deals_closed_buyers AS (
    SELECT
      cdc.id,
      cdc.created_at,
      cdc.deleted_at,
      cdc.created_by,
      cdc.date,
      d.title,
      d.email,
      d.phone_number,
      cdc.deal,
      d.brand
    FROM
      calendar.deals_buyers d
      JOIN current_deal_context cdc
        ON cdc.deal = d.deal
    WHERE
      (
        (cdc.key = 'closing_date' AND cdc.date < now())
        OR cdc.key = 'lease_end'
      )
      AND deal_status_mask(d.deal, '{Withdrawn,Cancelled,"Contract Terminated"}'::text[], cdc.key, '{expiration_date}'::text[], '{Sold,Leased}'::text[]) IS NOT FALSE
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
