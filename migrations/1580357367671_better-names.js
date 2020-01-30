const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE email_campaigns RENAME errored_at TO failed_at',
  'ALTER TABLE email_campaigns RENAME errored_within TO failed_within',
  'ALTER TABLE email_campaigns RENAME error TO failure',
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
