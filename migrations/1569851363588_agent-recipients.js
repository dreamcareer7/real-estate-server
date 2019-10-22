const db = require('../lib/utils/db')

const migrations = [
  `ALTER TYPE email_campaign_recipient_type
    ADD VALUE IF NOT EXISTS 'Agent'`,
  'ALTER TABLE email_campaigns_recipients ADD COLUMN IF NOT EXISTS agent uuid REFERENCES agents(id)',
  'ALTER TABLE email_campaign_emails ADD COLUMN IF NOT EXISTS agent uuid REFERENCES agents(id)',
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
