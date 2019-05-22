const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE email_campaign_emails ADD email_address TEXT',
  'ALTER TABLE email_campaign_emails ADD accepted     SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE email_campaign_emails ADD rejected     SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE email_campaign_emails ADD delivered    SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE email_campaign_emails ADD failed       SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE email_campaign_emails ADD opened       SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE email_campaign_emails ADD clicked      SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE email_campaign_emails ADD unsubscribed SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE email_campaign_emails ADD complained   SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE email_campaign_emails ADD stored       SMALLINT NOT NULL DEFAULT 0',

  `UPDATE email_campaign_emails ece SET
    email_address = (SELECT "to"[1] FROM emails WHERE ece.email = emails.id)`,

  'ALTER TABLE email_campaign_emails ALTER email_address SET NOT NULL',

  `UPDATE email_campaign_emails ece SET
  accepted     = (SELECT count(*) FROM emails_events WHERE campaign = ece.campaign AND email = ece.email AND event = 'accepted'),
  rejected     = (SELECT count(*) FROM emails_events WHERE campaign = ece.campaign AND email = ece.email AND event = 'rejected'),
  delivered    = (SELECT count(*) FROM emails_events WHERE campaign = ece.campaign AND email = ece.email AND event = 'delivered'),
  failed       = (SELECT count(*) FROM emails_events WHERE campaign = ece.campaign AND email = ece.email AND event = 'failed'),
  opened       = (SELECT count(*) FROM emails_events WHERE campaign = ece.campaign AND email = ece.email AND event = 'opened'),
  clicked      = (SELECT count(*) FROM emails_events WHERE campaign = ece.campaign AND email = ece.email AND event = 'clicked'),
  unsubscribed = (SELECT count(*) FROM emails_events WHERE campaign = ece.campaign AND email = ece.email AND event = 'unsubscribed'),
  complained   = (SELECT count(*) FROM emails_events WHERE campaign = ece.campaign AND email = ece.email AND event = 'complained'),
  stored       = (SELECT count(*) FROM emails_events WHERE campaign = ece.campaign AND email = ece.email AND event = 'stored')`,

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
