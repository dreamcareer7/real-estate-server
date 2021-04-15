const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE OR REPLACE VIEW brands_relations AS (
  SELECT id,
  (
    SELECT
      brands.name
    FROM
      brands as b
      JOIN brand_parents(brands.id) bp(id) using (id)
    WHERE
      b.brand_type = 'Office'
    LIMIT 1
  ) AS office,

  (
    SELECT
      brands.name
    FROM
      brands as b
      JOIN brand_parents(brands.id) bp(id) using (id)
    WHERE
      b.brand_type = 'Region'
    LIMIT 1
  ) AS region

  FROM
    brands
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
