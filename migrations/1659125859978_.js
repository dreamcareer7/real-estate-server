const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE emails_events ADD occured_at timestamp without time zone',
  `UPDATE emails_events
    SET occured_at = (TIMESTAMP 'epoch' + (object->'timestamp')::int * INTERVAL '1 second'), url = object->>'url'`,
  'ALTER TABLE emails_events DROP "object"',
  `CREATE OR REPLACE FUNCTION update_email_campaign_stats(campaign_id uuid, min_elapsed_time integer)
RETURNS void AS
$$
  WITH events AS (
    SELECT recipient, event, email, campaign, occured_at, client_os
    FROM emails_events
    JOIN emails ON emails.id = emails_events.email
    WHERE emails.campaign = $1 and
    (
      (
        emails_events.event in ('opened', 'clicked') and
        EXTRACT(EPOCH FROM(emails_events.created_at - emails.sent_at)) > $2
      )
      or
      (
        emails_events.event not in ('opened', 'clicked')
      )
    )

  ),

  recipient_counts AS (
    SELECT
      lower(recipient)                                    as recipient,
      count(*) filter(WHERE events.event = 'accepted')     as accepted,
      count(*) filter(WHERE events.event = 'rejected')     as rejected,
      count(*) filter(WHERE events.event = 'delivered')    as delivered,
      count(*) filter(WHERE events.event = 'failed')       as failed,
      count(*) filter(WHERE events.event = 'clicked')      as clicked,
      count(*) filter(WHERE events.event = 'unsubscribed') as unsubscribed,
      count(*) filter(WHERE events.event = 'complained')   as complained,
      count(*) filter(WHERE events.event = 'stored')       as stored,

      /*
        Mailgun's Opened events happen for each image existing in an email.
        That means when an email with several images is opened, we will receive N
        'opened' events, N being somewhere between 1 and number of images in that email.

        That means when someone opens an email once, but that email has 5 images, we'll show
        '5 opened'. This is obviously wrong.

        So, the following code, tries to group the opened events.
        It does so by '5 minute' range of time and user's client OS.

        Another bug this prevents is this: Some clients (Like Rechat's own email viewer)
        have rerendering issues. That means they rerender the contents of emails more than once.
        This type of error is quite common on react-based code.

        When that happens, we'll capcure N opened events, N being number of rerenders rather than opens.

        So as you can see, the number of 'opened' events we receive is quite unreliable. Grouping
        them with this logic is not flawless but a massive improvement.
      */
      (
        SELECT
          count(
            DISTINCT (
              ('epoch'::timestamptz + '300 seconds'::INTERVAL * (EXTRACT(epoch FROM (occured_at))::int4 / 300))::text
              ||
              '-'
              ||
              client_os
            )
          ) filter(WHERE events.event = 'opened')
      ) as opened

    FROM events
    GROUP BY lower(recipient)
  ),

  update_recipients AS (
    UPDATE email_campaign_emails ece SET
      accepted     = rc.accepted,
      rejected     = rc.rejected,
      delivered    = rc.delivered,
      failed       = rc.failed,
      clicked      = rc.clicked,
      unsubscribed = rc.unsubscribed,
      complained   = rc.complained,
      stored       = rc.stored,
      opened       = rc.opened
    FROM recipient_counts rc
    WHERE ece.campaign = $1
    AND LOWER(ece.email_address) = rc.recipient
    AND (
        (  ece.accepted,  ece.rejected,  ece.delivered,  ece.failed,  ece.clicked,  ece.unsubscribed,  ece.complained,  ece.stored,  ece.opened  )
        IS DISTINCT FROM
        (  rc.accepted,   rc.rejected,   rc.delivered,   rc.failed,   rc.clicked,   rc.unsubscribed,   rc.complained,   rc.stored,   rc.opened   )
    )
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
  ),

  update_emails AS (
    UPDATE emails e SET
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
    WHERE e.campaign = $1
    AND e.id = ec.email
    AND (
        (  e.accepted,   e.rejected,   e.delivered,   e.failed,   e.opened,   e.clicked,   e.unsubscribed,   e.complained,   e.stored   )
        IS DISTINCT FROM
        (  ec.accepted,  ec.rejected,  ec.delivered,  ec.failed,  ec.opened,  ec.clicked,  ec.unsubscribed,  ec.complained,  ec.stored  )
    )
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
      ) as stored

    FROM events
  )

  UPDATE email_campaigns ec SET
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
  WHERE ec.id = $1
    AND (
        (  ec.accepted,  ec.rejected,  ec.delivered,  ec.failed,  ec.opened,  ec.clicked,  ec.unsubscribed,  ec.complained,  ec.stored  )
        IS DISTINCT FROM
        (  cc.accepted,  cc.rejected,  cc.delivered,  cc.failed,  cc.opened,  cc.clicked,  cc.unsubscribed,  cc.complained,  cc.stored  )
  )
  RETURNING *;
$$
LANGUAGE SQL;
`,
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
