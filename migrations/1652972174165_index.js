const db = require('../lib/utils/db')

const migrations = [
  'CREATE INDEX CONCURRENTLY email_campaign_email_email ON email_campaign_emails(email)'
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
