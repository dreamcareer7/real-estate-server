const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE offices ADD COLUMN broker_mui bigint',
  'ALTER TABLE offices ADD COLUMN broker_mls_id text',
  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for (const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => { }
