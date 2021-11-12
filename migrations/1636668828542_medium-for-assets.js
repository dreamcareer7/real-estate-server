const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE brands_assets ADD medium template_medium',
  `ALTER TABLE brands_assets ADD CONSTRAINT brands_assets_template_type_and_medium CHECK 
    ((template_type IS NULL AND medium IS NULL) OR (template_type IS NOT NULL AND medium IS NOT NULL))`,
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
