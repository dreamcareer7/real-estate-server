const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE brands_contexts_checklists ADD COLUMN created_at timestamp without time zone DEFAULT NOW()',

  `WITH to_insert AS (
      SELECT
          (
              SELECT
                  brands_contexts.id
              FROM brands_contexts
              WHERE brand IN(SELECT * FROM brand_parents(brands_checklists.brand))
              AND key = 'photo'
              LIMIT 1
          ) as context,
          brands_checklists.id as checklist,
          false as required
      FROM brands_checklists
      WHERE checklist_type
      IN('Selling', 'Buying') AND id NOT IN(
          SELECT bcl.id
          FROM brands_checklists bcl
          JOIN brands_contexts_checklists bcc ON bcl.id = bcc.checklist
          JOIN brands_contexts bc ON bcc.context = bc.id
          WHERE bc.key = 'photo'
      )
  )
  INSERT INTO brands_contexts_checklists (context, checklist, is_required)
  SELECT * FROM to_insert WHERE context IS NOT NULL
  RETURNING *;
  `,

  `WITH to_insert AS (
      SELECT
          (
              SELECT
                  brands_contexts.id
              FROM brands_contexts
              WHERE brand IN(SELECT * FROM brand_parents(brands_checklists.brand))
              AND key = 'listing_status'
              LIMIT 1
          ) as context,
          brands_checklists.id as checklist,
          false as required
      FROM brands_checklists
      WHERE checklist_type
      IN('Selling', 'Buying') AND id NOT IN(
          SELECT bcl.id
          FROM brands_checklists bcl
          JOIN brands_contexts_checklists bcc ON bcl.id = bcc.checklist
          JOIN brands_contexts bc ON bcc.context = bc.id
          WHERE bc.key = 'listing_status'
      )
  )
  INSERT INTO brands_contexts_checklists (context, checklist, is_required)
  SELECT * FROM to_insert WHERE context IS NOT NULL
  RETURNING *;`,

  `WITH to_insert AS (
      SELECT
          (
              SELECT
                  brands_contexts.id
              FROM brands_contexts
              WHERE brand IN(SELECT * FROM brand_parents(brands_checklists.brand))
              AND key = 'contract_status'
              LIMIT 1
          ) as context,
          brands_checklists.id as checklist,
          false as required
      FROM brands_checklists
      WHERE checklist_type
      IN('Buying', 'Offer') AND id NOT IN(
          SELECT bcl.id
          FROM brands_checklists bcl
          JOIN brands_contexts_checklists bcc ON bcl.id = bcc.checklist
          JOIN brands_contexts bc ON bcc.context = bc.id
          WHERE bc.key = 'contract_status'
      )
  )
  INSERT INTO brands_contexts_checklists (context, checklist, is_required)
  SELECT * FROM to_insert WHERE context IS NOT NULL
  RETURNING *;`,

  'SELECT update_current_deal_context(id) FROM deals',

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
