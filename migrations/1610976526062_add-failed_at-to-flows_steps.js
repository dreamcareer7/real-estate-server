const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE flows_steps ADD COLUMN failed_at timestamptz',
  'ALTER TABLE flows_steps ADD COLUMN failed_within text',
  'ALTER TABLE flows_steps ADD COLUMN failure text',
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
