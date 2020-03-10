const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE UNIQUE INDEX current_deal_context_unique_idx ON current_deal_context (deal, checklist, key);',
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
