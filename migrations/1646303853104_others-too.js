const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `WITH to_insert AS (
      SELECT
          (
              SELECT
                  brands_contexts.id
              FROM brands_contexts
              WHERE brand IN(SELECT * FROM brand_parents(brands_checklists.brand))
              AND key = 'mls_area_major'
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
          WHERE bc.key = 'mls_area_major'
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
              AND key = 'mls_area_minor'
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
          WHERE bc.key = 'mls_area_minor'
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
              AND key = 'county'
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
          WHERE bc.key = 'county'
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
              AND key = 'postal_code'
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
          WHERE bc.key = 'postal_code'
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
              AND key = 'state_code'
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
          WHERE bc.key = 'state_code'
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
              AND key = 'state'
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
          WHERE bc.key = 'state'
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
              AND key = 'city'
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
          WHERE bc.key = 'city'
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
              AND key = 'street_address'
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
          WHERE bc.key = 'street_address'
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
              AND key = 'street_suffix'
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
          WHERE bc.key = 'street_suffix'
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
              AND key = 'street_name'
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
          WHERE bc.key = 'street_name'
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
              AND key = 'street_dir_prefix'
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
          WHERE bc.key = 'street_dir_prefix'
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
              AND key = 'street_number'
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
          WHERE bc.key = 'street_number'
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
              AND key = 'subdivision'
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
          WHERE bc.key = 'subdivision'
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
              AND key = 'block_number'
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
          WHERE bc.key = 'block_number'
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
              AND key = 'lot_number'
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
          WHERE bc.key = 'lot_number'
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
              AND key = 'project_name'
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
          WHERE bc.key = 'project_name'
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
              AND key = 'building_number'
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
          WHERE bc.key = 'building_number'
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
              AND key = 'unit_number'
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
          WHERE bc.key = 'unit_number'
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
              AND key = 'full_address'
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
          WHERE bc.key = 'full_address'
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
              AND key = 'mls_number'
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
          WHERE bc.key = 'mls_number'
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
