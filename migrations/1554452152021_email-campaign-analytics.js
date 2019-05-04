const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE email_campaigns ADD accepted     SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE email_campaigns ADD rejected     SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE email_campaigns ADD delivered    SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE email_campaigns ADD failed       SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE email_campaigns ADD opened       SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE email_campaigns ADD clicked      SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE email_campaigns ADD unsubscribed SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE email_campaigns ADD complained   SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE email_campaigns ADD stored       SMALLINT NOT NULL DEFAULT 0',

  `UPDATE email_campaigns SET
  accepted     = (SELECT count(*) FROM emails_events JOIN emails ON emails_events.email = emails.id WHERE campaign = email_campaigns.id AND event = 'accepted'),
  rejected     = (SELECT count(*) FROM emails_events JOIN emails ON emails_events.email = emails.id WHERE campaign = email_campaigns.id AND event = 'rejected'),
  delivered    = (SELECT count(*) FROM emails_events JOIN emails ON emails_events.email = emails.id WHERE campaign = email_campaigns.id AND event = 'delivered'),
  failed       = (SELECT count(*) FROM emails_events JOIN emails ON emails_events.email = emails.id WHERE campaign = email_campaigns.id AND event = 'failed'),
  opened       = (SELECT count(*) FROM emails_events JOIN emails ON emails_events.email = emails.id WHERE campaign = email_campaigns.id AND event = 'opened'),
  clicked      = (SELECT count(*) FROM emails_events JOIN emails ON emails_events.email = emails.id WHERE campaign = email_campaigns.id AND event = 'clicked'),
  unsubscribed = (SELECT count(*) FROM emails_events JOIN emails ON emails_events.email = emails.id WHERE campaign = email_campaigns.id AND event = 'unsubscribed'),
  complained   = (SELECT count(*) FROM emails_events JOIN emails ON emails_events.email = emails.id WHERE campaign = email_campaigns.id AND event = 'complained'),
  stored       = (SELECT count(*) FROM emails_events JOIN emails ON emails_events.email = emails.id WHERE campaign = email_campaigns.id AND event = 'stored')`,
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
