const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE emails ADD accepted     SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE emails ADD rejected     SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE emails ADD delivered    SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE emails ADD failed       SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE emails ADD opened       SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE emails ADD clicked      SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE emails ADD unsubscribed SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE emails ADD complained   SMALLINT NOT NULL DEFAULT 0',
  'ALTER TABLE emails ADD stored       SMALLINT NOT NULL DEFAULT 0',

  `UPDATE emails SET
  accepted     = (SELECT count(*) FROM emails_events JOIN emails ON emails_events.email = emails.id WHERE event = 'accepted'),
  rejected     = (SELECT count(*) FROM emails_events JOIN emails ON emails_events.email = emails.id WHERE event = 'rejected'),
  delivered    = (SELECT count(*) FROM emails_events JOIN emails ON emails_events.email = emails.id WHERE event = 'delivered'),
  failed       = (SELECT count(*) FROM emails_events JOIN emails ON emails_events.email = emails.id WHERE event = 'failed'),
  opened       = (SELECT count(*) FROM emails_events JOIN emails ON emails_events.email = emails.id WHERE event = 'opened'),
  clicked      = (SELECT count(*) FROM emails_events JOIN emails ON emails_events.email = emails.id WHERE event = 'clicked'),
  unsubscribed = (SELECT count(*) FROM emails_events JOIN emails ON emails_events.email = emails.id WHERE event = 'unsubscribed'),
  complained   = (SELECT count(*) FROM emails_events JOIN emails ON emails_events.email = emails.id WHERE event = 'complained'),
  stored       = (SELECT count(*) FROM emails_events JOIN emails ON emails_events.email = emails.id WHERE event = 'stored')`,
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
