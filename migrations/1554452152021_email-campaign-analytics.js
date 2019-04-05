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
  accepted     = (SELECT count(*) FROM email_events WHERE campaign = email_campaigns.id AND event_type = 'accepted'),
  rejected     = (SELECT count(*) FROM email_events WHERE campaign = email_campaigns.id AND event_type = 'rejected'),
  delivered    = (SELECT count(*) FROM email_events WHERE campaign = email_campaigns.id AND event_type = 'delivered'),
  failed       = (SELECT count(*) FROM email_events WHERE campaign = email_campaigns.id AND event_type = 'failed'),
  opened       = (SELECT count(*) FROM email_events WHERE campaign = email_campaigns.id AND event_type = 'opened'),
  clicked      = (SELECT count(*) FROM email_events WHERE campaign = email_campaigns.id AND event_type = 'clicked'),
  unsubscribed = (SELECT count(*) FROM email_events WHERE campaign = email_campaigns.id AND event_type = 'unsubscribed'),
  complained   = (SELECT count(*) FROM email_events WHERE campaign = email_campaigns.id AND event_type = 'complained'),
  stored       = (SELECT count(*) FROM email_events WHERE campaign = email_campaigns.id AND event_type = 'stored'),
  `,
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
