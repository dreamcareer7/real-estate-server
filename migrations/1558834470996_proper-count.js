const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
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
      SELECT count(*) as count, event, recipient FROM events
      GROUP BY event, recipient
    ),

    update_recipients AS (
      UPDATE email_campaign_emails ece SET
        accepted     = COALESCE((SELECT count FROM recipient_counts rc WHERE ece.email_address = rc.recipient AND event = 'accepted'    ), 0),
        rejected     = COALESCE((SELECT count FROM recipient_counts rc WHERE ece.email_address = rc.recipient AND event = 'rejected'    ), 0),
        delivered    = COALESCE((SELECT count FROM recipient_counts rc WHERE ece.email_address = rc.recipient AND event = 'delivered'   ), 0),
        failed       = COALESCE((SELECT count FROM recipient_counts rc WHERE ece.email_address = rc.recipient AND event = 'failed'      ), 0),
        opened       = COALESCE((SELECT count FROM recipient_counts rc WHERE ece.email_address = rc.recipient AND event = 'opened'      ), 0),
        clicked      = COALESCE((SELECT count FROM recipient_counts rc WHERE ece.email_address = rc.recipient AND event = 'clicked'     ), 0),
        unsubscribed = COALESCE((SELECT count FROM recipient_counts rc WHERE ece.email_address = rc.recipient AND event = 'unsubscribed'), 0),
        complained   = COALESCE((SELECT count FROM recipient_counts rc WHERE ece.email_address = rc.recipient AND event = 'complained'  ), 0),
        stored       = COALESCE((SELECT count FROM recipient_counts rc WHERE ece.email_address = rc.recipient AND event = 'stored'      ), 0)
      FROM recipient_counts rc
      WHERE ece.campaign = $1
      AND   ece.email_address = rc.recipient
    ),

  email_counts AS (
    SELECT count(DISTINCT email) as count, event, email FROM events
    GROUP BY event, email
  ),

  update_emails AS (
    UPDATE emails SET
      accepted     = COALESCE((SELECT count FROM email_counts WHERE email = emails.id AND event = 'accepted'    ), 0),
      rejected     = COALESCE((SELECT count FROM email_counts WHERE email = emails.id AND event = 'rejected'    ), 0),
      delivered    = COALESCE((SELECT count FROM email_counts WHERE email = emails.id AND event = 'delivered'   ), 0),
      failed       = COALESCE((SELECT count FROM email_counts WHERE email = emails.id AND event = 'failed'      ), 0),
      opened       = COALESCE((SELECT count FROM email_counts WHERE email = emails.id AND event = 'opened'      ), 0),
      clicked      = COALESCE((SELECT count FROM email_counts WHERE email = emails.id AND event = 'clicked'     ), 0),
      unsubscribed = COALESCE((SELECT count FROM email_counts WHERE email = emails.id AND event = 'unsubscribed'), 0),
      complained   = COALESCE((SELECT count FROM email_counts WHERE email = emails.id AND event = 'complained'  ), 0),
      stored       = COALESCE((SELECT count FROM email_counts WHERE email = emails.id AND event = 'stored'      ), 0)

    WHERE campaign = $1
  ),

  campaign_counts AS (
    SELECT count(DISTINCT email) as count, event FROM events
    GROUP BY event
  )

  UPDATE email_campaigns SET
    accepted     = COALESCE((SELECT count FROM campaign_counts WHERE event = 'accepted'    ), 0),
    rejected     = COALESCE((SELECT count FROM campaign_counts WHERE event = 'rejected'    ), 0),
    delivered    = COALESCE((SELECT count FROM campaign_counts WHERE event = 'delivered'   ), 0),
    failed       = COALESCE((SELECT count FROM campaign_counts WHERE event = 'failed'      ), 0),
    opened       = COALESCE((SELECT count FROM campaign_counts WHERE event = 'opened'      ), 0),
    clicked      = COALESCE((SELECT count FROM campaign_counts WHERE event = 'clicked'     ), 0),
    unsubscribed = COALESCE((SELECT count FROM campaign_counts WHERE event = 'unsubscribed'), 0),
    complained   = COALESCE((SELECT count FROM campaign_counts WHERE event = 'complained'  ), 0),
    stored       = COALESCE((SELECT count FROM campaign_counts WHERE event = 'stored'      ), 0)

  WHERE id = $1
$$
LANGUAGE SQL`,
  'SELECT update_email_campaign_stats(id) FROM email_campaigns',
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
