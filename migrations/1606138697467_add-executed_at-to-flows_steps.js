const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE flows_steps ADD COLUMN executed_at timestamptz',
  'ALTER TABLE flows ADD COLUMN stopped_at timestamptz',
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
