const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE ee (
    id uuid NOT NULL DEFAULT uuid_generate_v1(),
    email uuid not null,
    created_at timestamp with time zone not null,
    recipient text,
    event email_event not null,
    url text,
    ip text,
    client_os text,
    client_type text,
    device_type emails_events_device,
    location json,
    occured_at timestamp without time zone,
    campaign uuid REFERENCES email_campaigns(id)
) PARTITION BY HASH(campaign);`,

  'CREATE INDEX emails_events_campaign ON ee(campaign);',

  'CREATE TABLE emails_events0 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 0);',
  'CREATE TABLE emails_events1 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 1);',
  'CREATE TABLE emails_events2 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 2);',
  'CREATE TABLE emails_events3 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 3);',
  'CREATE TABLE emails_events4 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 4);',
  'CREATE TABLE emails_events5 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 5);',
  'CREATE TABLE emails_events6 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 6);',
  'CREATE TABLE emails_events7 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 7);',
  'CREATE TABLE emails_events8 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 8);',
  'CREATE TABLE emails_events9 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 9);',
  'CREATE TABLE emails_events10 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 10);',
  'CREATE TABLE emails_events11 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 11);',
  'CREATE TABLE emails_events12 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 12);',
  'CREATE TABLE emails_events13 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 13);',
  'CREATE TABLE emails_events14 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 14);',
  'CREATE TABLE emails_events15 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 15);',
  'CREATE TABLE emails_events16 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 16);',
  'CREATE TABLE emails_events17 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 17);',
  'CREATE TABLE emails_events18 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 18);',
  'CREATE TABLE emails_events19 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 19);',
  'CREATE TABLE emails_events20 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 20);',
  'CREATE TABLE emails_events21 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 21);',
  'CREATE TABLE emails_events22 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 22);',
  'CREATE TABLE emails_events23 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 23);',
  'CREATE TABLE emails_events24 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 24);',
  'CREATE TABLE emails_events25 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 25);',
  'CREATE TABLE emails_events26 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 26);',
  'CREATE TABLE emails_events27 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 27);',
  'CREATE TABLE emails_events28 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 28);',
  'CREATE TABLE emails_events29 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 29);',
  'CREATE TABLE emails_events30 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 30);',
  'CREATE TABLE emails_events31 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 31);',
  'CREATE TABLE emails_events32 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 32);',
  'CREATE TABLE emails_events33 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 33);',
  'CREATE TABLE emails_events34 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 34);',
  'CREATE TABLE emails_events35 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 35);',
  'CREATE TABLE emails_events36 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 36);',
  'CREATE TABLE emails_events37 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 37);',
  'CREATE TABLE emails_events38 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 38);',
  'CREATE TABLE emails_events39 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 39);',
  'CREATE TABLE emails_events40 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 40);',
  'CREATE TABLE emails_events41 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 41);',
  'CREATE TABLE emails_events42 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 42);',
  'CREATE TABLE emails_events43 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 43);',
  'CREATE TABLE emails_events44 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 44);',
  'CREATE TABLE emails_events45 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 45);',
  'CREATE TABLE emails_events46 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 46);',
  'CREATE TABLE emails_events47 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 47);',
  'CREATE TABLE emails_events48 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 48);',
  'CREATE TABLE emails_events49 PARTITION OF ee FOR VALUES WITH (MODULUS 50,REMAINDER 49);',

  `INSERT INTO ee
  SELECT emails_events.*, emails.campaign
  FROM emails_events JOIN emails ON emails_events.email = emails.id`,

  'ALTER TABLE emails_events RENAME TO emails_events_old',
  'ALTER TABLE ee RENAME TO emails_events',

  `CREATE OR REPLACE FUNCTION update_email_campaign_stats(campaign_id uuid, min_elapsed_time integer)
RETURNS void AS
$$
  WITH events AS (
    SELECT recipient, event, email, emails_events.campaign, occured_at, client_os
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
LANGUAGE SQL;`,

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
