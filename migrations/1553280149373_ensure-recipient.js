const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `ALTER TABLE email_campaigns_recipients
   ADD CONSTRAINT has_recipient CHECK(email IS NOT NULL OR tag IS NOT NULL or list IS NOT NULL)`,
  'COMMIT'
]


const run = async () => {
  const conn = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
