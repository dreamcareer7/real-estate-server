CREATE OR REPLACE FUNCTION update_email_campaign_stats(campaign_id uuid)
RETURNS void AS
$$
  WITH events AS (
    SELECT recipient, event, email, campaign, object, client_os
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
      count(*) filter(WHERE events.event = 'clicked')      as clicked,
      count(*) filter(WHERE events.event = 'unsubscribed') as unsubscribed,
      count(*) filter(WHERE events.event = 'complained')   as complained,
      count(*) filter(WHERE events.event = 'stored')       as stored
    FROM events
    GROUP BY recipient
    ORDER BY recipient
  ),

  /*
    Mailgun's Opened events happen for each image existing in an email.
    That means when an email with several images is opened, we will receive N
    'opened' events, N being somewhere between 1 and number of images in that email.

    That means when someone opens an email once, but that email has 5 images, we'll show
    `5 opened`. This is obviously wrong.

    So, the following code, tries to group the opened events.
    It does so by `5 minute` range of time and user's client OS.

    Another bug this prevents is this: Some clients (Like Rechat's own email viewer)
    have rerendering issues. That means they rerender the contents of emails more than once.
    This type of error is quite common on react-based code.

    When that happens, we'll capcure N opened events, N being number of rerenders rather than opens.

    So as you can see, the number of 'opened' events we receive is quite unreliable. Grouping
    them with this logic is not flawless but a massive improvement.
  */

  grouped_opens AS (
    SELECT
      recipient,
      (
        ('epoch'::timestamptz + '300 seconds'::INTERVAL * (EXTRACT(epoch FROM (
          (TIMESTAMP 'epoch' + (object->'timestamp')::int * INTERVAL '1 second')
        ))::int4 / 300))::text
        ||
        '-'
        ||
        client_os
      ),
      count(*)
    FROM events
    WHERE event = 'opened'
    GROUP BY 1,2
  ),

  /* Update all stats available from recipient_counts. Open events are NOT updated here. */
  update_recipients AS (
    UPDATE email_campaign_emails ece SET
      accepted     = rc.accepted,
      rejected     = rc.rejected,
      delivered    = rc.delivered,
      failed       = rc.failed,
      clicked      = rc.clicked,
      unsubscribed = rc.unsubscribed,
      complained   = rc.complained,
      stored       = rc.stored
    FROM recipient_counts rc
    WHERE ece.campaign = $1
    AND LOWER(ece.email_address) = LOWER(rc.recipient)
  ),

  /* Update open counts using grouped_opens for every recipient */
  update_recipient_opens AS (
    WITH recipient_opens AS (
      SELECT
        go.recipient,
        count(go.*) AS opens
      FROM
        grouped_opens AS go
      GROUP BY
        go.recipient
    )
    UPDATE email_campaign_emails ece SET
      opened = ro.opens
    FROM recipient_opens ro
    WHERE ece.campaign = $1
    AND LOWER(ece.email_address) = LOWER(ro.recipient)
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
      ) as stored

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
  WHERE email_campaigns.id = $1 RETURNING *;
$$
LANGUAGE SQL;
