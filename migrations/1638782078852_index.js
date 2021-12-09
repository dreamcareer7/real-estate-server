const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE INDEX current_deal_context_key_date ON current_deal_context (key, date) 
    WHERE deleted_at IS NULL AND data_type = 'Date'`,
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
