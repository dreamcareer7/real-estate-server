const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `ALTER TABLE email_campaigns
     ADD COLUMN recipients_count int`,

  `WITH recipients_counts AS (
     SELECT
       ecre.campaign,
       count(DISTINCT lower(trim(ecre.email))) AS recipients_count
     FROM email_campaigns AS ec
     JOIN email_campaigns_recipient_emails AS ecre ON ecre.campaign = ec.id
     WHERE
       ecre.email IS NOT NULL AND
       ec.executed_at IS NOT NULL
     GROUP BY ecre.campaign
   )
   UPDATE email_campaigns AS ec SET
     recipients_count = rc.recipients_count
   FROM recipients_counts AS rc
   WHERE rc.campaign = ec.id`,

  'COMMIT',
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
