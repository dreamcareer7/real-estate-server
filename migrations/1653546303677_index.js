const db = require('../lib/utils/db')

const migrations = [
  'CREATE INDEX CONCURRENTLY current_deal_context_searchable ON current_deal_context (searchable)'
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
