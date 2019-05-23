const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE INDEX email_campaigns_recipients_campaign_idx ON email_campaigns_recipients (campaign)',
  'CREATE INDEX email_campaigns_recipients_campaign_idx ON email_campaigns_recipients (tag)',
  'CREATE INDEX email_campaigns_recipients_campaign_idx ON email_campaigns_recipients (list)',
  'CREATE INDEX email_campaigns_recipients_campaign_idx ON email_campaigns_recipients (contact)',

  'CREATE INDEX email_campaign_emails_contact_idx ON email_campaign_emails (contact)',
  'CREATE INDEX email_campaign_emails_campaign_idx ON email_campaign_emails (campaign)',

  'CREATE INDEX email_campaigns_brand_idx ON email_campaigns (brand)',
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
