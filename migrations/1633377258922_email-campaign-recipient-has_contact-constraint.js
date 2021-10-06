const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE email_campaigns_recipients ADD CONSTRAINT has_contact CHECK (recipient_type = \'Contact\'::email_campaign_recipient_type AND contact IS NOT NULL OR recipient_type <> \'Contact\'::email_campaign_recipient_type)',
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
