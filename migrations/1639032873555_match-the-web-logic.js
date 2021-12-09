const db = require('../lib/utils/db')

const migrations = [
  `CREATE OR REPLACE VIEW deal_statuses AS (
  WITH deal_brands AS (
    SELECT d.id as deal, brand_parents(d.brand) as brand FROM deals d
  )
  SELECT
    DISTINCT ON (deals.id)
    deals.id as deal,
    cdc.key,
    cdc.text,

    bds.label,
    bds.is_active,
    bds.is_pending,
    bds.is_archived,
    bds.is_closed
  FROM deals
  JOIN current_deal_context cdc ON deals.id = cdc.deal AND cdc.deleted_at IS NULL
  LEFT JOIN deals_checklists checklists
    ON checklists.id = cdc.checklist AND checklists.deleted_at IS NULL AND checklists.terminated_at IS NULL AND checklists.deactivated_at IS NULL
  LEFT JOIN brands_checklists ON checklists.origin = brands_checklists.id

  JOIN deal_brands ON deals.id = deal_brands.deal

  LEFT JOIN brands_deal_statuses bds ON bds.brand = deal_brands.brand
  AND  bds.label = cdc.text AND bds.deleted_at IS NULL

  WHERE 
    (
      (
            cdc.key = 'listing_status'
        AND (brands_checklists.checklist_type = 'Selling' OR brands_checklists.id IS NULL AND cdc.source = 'MLS')
        AND deals.deal_type <> 'Buying'
      )
      OR (
            cdc.key = 'contract_status'
        AND brands_checklists.checklist_type IN('Offer', 'Buying')
      )
    )

    AND deals.deleted_at IS NULL

  ORDER BY deals.id, cdc.key = 'contract_status' DESC, bds.id IS NULL, cdc.created_at DESC
)`
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
