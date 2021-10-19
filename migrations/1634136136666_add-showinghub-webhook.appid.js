const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE showinghub_webhooks ADD COLUMN app_id uuid NOT NULL DEFAULT \'72a1574b-c548-44a0-4a23-08d98e4d6bb9\'',
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
