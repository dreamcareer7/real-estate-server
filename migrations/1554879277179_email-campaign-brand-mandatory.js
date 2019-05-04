const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE email_campaigns ALTER brand SET NOT NULL',
  `CREATE TABLE email_campaign_emails(
    id uuid NOT NULL DEFAULT uuid_generate_v1() PRIMARY KEY,
    campaign uuid NOT NULL REFERENCES email_campaigns(id),
    email uuid NOT NULL REFERENCES emails(id),
    contact uuid REFERENCES contacts(id),
    recipient_type email_campaign_recipient_type NOT NULL
  )`,
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
