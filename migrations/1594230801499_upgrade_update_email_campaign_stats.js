const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'DROP FUNCTION IF EXISTS update_email_campaign_stats(uuid)',

  `CREATE OR REPLACE FUNCTION update_email_campaign_stats(campaign_id uuid)
  RETURNS void AS
  $$
    WITH events AS (
      SELECT recipient, event, email, campaign
      FROM emails_events
      JOIN emails ON emails.id = emails_events.email
      WHERE emails.campaign = $1
    ),

    recipient_counts AS (
      SELECT
        recipient,
        count(*) filter(WHERE events.event = 'accepted')     as accepted,
        count(*) filter(WHERE events.event = 'rejected')     as rejected,
        count(*) filter(WHERE events.event = 'delivered')    as delivered,
        count(*) filter(WHERE events.event = 'failed')       as failed,
        count(*) filter(WHERE events.event = 'opened')       as opened,
        count(*) filter(WHERE events.event = 'clicked')      as clicked,
        count(*) filter(WHERE events.event = 'unsubscribed') as unsubscribed,
        count(*) filter(WHERE events.event = 'complained')   as complained,
        count(*) filter(WHERE events.event = 'stored')       as stored
      FROM events
      GROUP BY recipient
      ORDER BY recipient
    ),

    update_recipients AS (
      UPDATE email_campaign_emails ece SET
        accepted     = rc.accepted,
        rejected     = rc.rejected,
        delivered    = rc.delivered,
        failed       = rc.failed,
        opened       = rc.opened,
        clicked      = rc.clicked,
        unsubscribed = rc.unsubscribed,
        complained   = rc.complained,
        stored       = rc.stored
      FROM recipient_counts rc
      WHERE ece.campaign = $1
      AND ece.email_address = rc.recipient
    ),

    email_counts AS (
      SELECT
          email,
          count(DISTINCT email) filter(WHERE events.event = 'accepted')     as accepted,
          count(DISTINCT email) filter(WHERE events.event = 'rejected')     as rejected,
          count(DISTINCT email) filter(WHERE events.event = 'delivered')    as delivered,
          count(DISTINCT email) filter(WHERE events.event = 'failed')       as failed,
          count(DISTINCT email) filter(WHERE events.event = 'opened')       as opened,
          count(DISTINCT email) filter(WHERE events.event = 'clicked')      as clicked,
          count(DISTINCT email) filter(WHERE events.event = 'unsubscribed') as unsubscribed,
          count(DISTINCT email) filter(WHERE events.event = 'complained')   as complained,
          count(DISTINCT email) filter(WHERE events.event = 'stored')       as stored
        FROM events
        GROUP BY email
        ORDER BY email
    ),

    update_emails AS (
      UPDATE emails SET
        accepted     = ec.accepted,
        rejected     = ec.rejected,
        delivered    = ec.delivered,
        failed       = ec.failed,
        opened       = ec.opened,
        clicked      = ec.clicked,
        unsubscribed = ec.unsubscribed,
        complained   = ec.complained,
        stored       = ec.stored
      FROM email_counts ec
      WHERE emails.campaign = $1
      AND emails.id = ec.email
    ),

    campaign_counts AS (
      SELECT
        (
          count(DISTINCT recipient) filter(WHERE events.event = 'accepted' AND recipient is NOT NULL)
          +
          count(*) filter(WHERE events.event = 'accepted' AND recipient is NULL)
        ) as accepted,
  
        (
          count(DISTINCT recipient) filter(WHERE events.event = 'rejected' AND recipient is NOT NULL)
          +
          count(*) filter(WHERE events.event = 'rejected' AND recipient is NULL)
        ) as rejected,
  
        (
          count(DISTINCT recipient) filter(WHERE events.event = 'delivered' AND recipient is NOT NULL)
          +
          count(*) filter(WHERE events.event = 'delivered' AND recipient is NULL)
        ) as delivered,
  
        (
          count(DISTINCT recipient) filter(WHERE events.event = 'failed' AND recipient is NOT NULL)
          +
          count(*) filter(WHERE events.event = 'failed' AND recipient is NULL)
        ) as failed,
  
        (
          count(DISTINCT recipient) filter(WHERE events.event = 'opened' AND recipient is NOT NULL)
          +
          count(*) filter(WHERE events.event = 'opened' AND recipient is NULL)
        ) as opened,
  
        (
          count(DISTINCT recipient) filter(WHERE events.event = 'clicked' AND recipient is NOT NULL)
          +
          count(*) filter(WHERE events.event = 'clicked' AND recipient is NULL)
        ) as clicked,
  
        (
          count(DISTINCT recipient) filter(WHERE events.event = 'unsubscribed' AND recipient is NOT NULL)
          +
          count(*) filter(WHERE events.event = 'unsubscribed' AND recipient is NULL)
        ) as unsubscribed,
  
        (
          count(DISTINCT recipient) filter(WHERE events.event = 'complained' AND recipient is NOT NULL)
          +
          count(*) filter(WHERE events.event = 'complained' AND recipient is NULL)
        ) as complained,
  
        (
          count(DISTINCT recipient) filter(WHERE events.event = 'stored' AND recipient is NOT NULL)
          +
          count(*) filter(WHERE events.event = 'stored' AND recipient is NULL)
        ) as stored,
      FROM events
    )

    UPDATE email_campaigns SET
      accepted     = cc.accepted,
      rejected     = cc.rejected,
      delivered    = cc.delivered,
      failed       = cc.failed,
      opened       = cc.opened,
      clicked      = cc.clicked,
      unsubscribed = cc.unsubscribed,
      complained   = cc.complained,
      stored       = cc.stored
    FROM campaign_counts cc
    WHERE email_campaigns.id = $1
  $$
  LANGUAGE SQL`,

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
