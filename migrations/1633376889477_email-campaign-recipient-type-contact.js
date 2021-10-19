const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TYPE email_campaign_recipient_type ADD VALUE IF NOT EXISTS \'Contact\'',
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
