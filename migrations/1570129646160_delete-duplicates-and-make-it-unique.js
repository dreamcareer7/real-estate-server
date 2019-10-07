const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `WITH duplicates AS (
    SELECT
      ROW_NUMBER() OVER(ORDER BY bat.template, bat.brand) as num,
      bat.id AS extra_id
    FROM brands_allowed_templates bat
    JOIN brands_allowed_templates bat2 ON
      bat.template = bat2.template
      AND bat.brand = bat2.brand
      AND bat.id <> bat2.id
    ORDER BY num
  )

  DELETE FROM brands_allowed_templates WHERE id IN (
    SELECT extra_id FROM duplicates WHERE num % 2 = 1
  )`,

  'ALTER TABLE brands_allowed_templates ADD CONSTRAINT unique_brand_template UNIQUE(brand, template)',

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
