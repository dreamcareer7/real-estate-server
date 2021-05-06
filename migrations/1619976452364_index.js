const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE INDEX current_deal_context_deleted_at ON current_deal_context(deleted_at)',
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
