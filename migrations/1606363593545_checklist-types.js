const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE brands_property_types (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at timestamp with time zone DEFAULT CLOCK_TIMESTAMP(),
    updated_at timestamp with time zone DEFAULT CLOCK_TIMESTAMP(),
    deleted_at timestamp with time zone,
    brand uuid NOT NULL REFERENCES brands(id),
    label TEXT,
    is_lease BOOLEAN NOT NULL
  )`,

  `INSERT INTO brands_property_types (brand, label, is_lease)
    SELECT DISTINCT brand,
    UNNEST(ENUM_RANGE(NULL::deal_property_type)) as label,
    label ILIKE '%Lease%' as is_lease
    FROM brands_deal_statuses
    ORDER BY brand`,

  'ALTER TABLE deals ADD dynamic_property_type uuid REFERENCES brands_property_types(id)',

  `UPDATE deals SET dynamic_property_type = (
    SELECT id FROM brands_property_types bpt
    WHERE bpt.label = deals.property_type::text
    AND   bpt.brand IN(
      SELECT * FROM brand_parents(id)
    )
    LIMIT 1
  )`,

  'ALTER TABLE deals ALTER dynamic_property_type SET NOT NULL',

  'ALTER TABLE deals DROP property_type',

  'ALTER TABLE deals RENAME dynamic_property_type TO property_type',

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
