const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE email_campaigns ADD errored_at timestamp without time zone',
  'ALTER TABLE email_campaigns ADD errored_within uuid',
  'ALTER TABLE email_campaigns ADD error TEXT',
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
