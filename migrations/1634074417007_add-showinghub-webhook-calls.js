const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE showinghub_webhooks (
    created_at timestamp PRIMARY KEY DEFAULT clock_timestamp(),
    payload json
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
