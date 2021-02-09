const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE brands_flow_steps DROP COLUMN template',
  'ALTER TABLE brands_flow_steps ADD COLUMN template uuid REFERENCES brands_allowed_templates (id)',
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
