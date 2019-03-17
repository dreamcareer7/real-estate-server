const db = require('../lib/utils/db')

const migrations = [
  `CREATE TYPE email_campaign_recipient_type
  AS ENUM('To', 'CC', 'BCC')`,

  'ALTER TABLE email_campaigns_recipients ADD recipient_type email_campaign_recipient_type',

  `UPDATE email_campaigns_recipients
   SET recipient_type = 'To'`,

   'ALTER TABLE email_campaigns_recipients ALTER recipient_type SET NOT NULL',

   'ALTER TABLE emails ADD cc text[]',
   'ALTER TABLE emails ADD bcc text[]',
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
