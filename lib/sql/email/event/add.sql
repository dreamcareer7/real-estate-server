WITH count_campaign AS (
  UPDATE email_campaigns SET

    accepted     = (CASE WHEN $2 = 'accepted'     THEN "accepted"     + 1 ELSE "accepted"     END),
    rejected     = (CASE WHEN $2 = 'rejected'     THEN "rejected"     + 1 ELSE "rejected"     END),
    delivered    = (CASE WHEN $2 = 'delivered'    THEN "delivered"    + 1 ELSE "delivered"    END),
    failed       = (CASE WHEN $2 = 'failed'       THEN "failed"       + 1 ELSE "failed"       END),
    opened       = (CASE WHEN $2 = 'opened'       THEN "opened"       + 1 ELSE "opened"       END),
    clicked      = (CASE WHEN $2 = 'clicked'      THEN "clicked"      + 1 ELSE "clicked"      END),
    unsubscribed = (CASE WHEN $2 = 'unsubscribed' THEN "unsubscribed" + 1 ELSE "unsubscribed" END),
    complained   = (CASE WHEN $2 = 'complained'   THEN "complained"   + 1 ELSE "complained"   END),
    stored       = (CASE WHEN $2 = 'stored'       THEN "stored"       + 1 ELSE "stored"       END)

  WHERE id = (SELECT campaign FROM emails WHERE mailgun_id = $1)
),

count_email AS (
  UPDATE emails SET

    accepted     = (CASE WHEN $2 = 'accepted'     THEN "accepted"     + 1 ELSE "accepted"     END),
    rejected     = (CASE WHEN $2 = 'rejected'     THEN "rejected"     + 1 ELSE "rejected"     END),
    delivered    = (CASE WHEN $2 = 'delivered'    THEN "delivered"    + 1 ELSE "delivered"    END),
    failed       = (CASE WHEN $2 = 'failed'       THEN "failed"       + 1 ELSE "failed"       END),
    opened       = (CASE WHEN $2 = 'opened'       THEN "opened"       + 1 ELSE "opened"       END),
    clicked      = (CASE WHEN $2 = 'clicked'      THEN "clicked"      + 1 ELSE "clicked"      END),
    unsubscribed = (CASE WHEN $2 = 'unsubscribed' THEN "unsubscribed" + 1 ELSE "unsubscribed" END),
    complained   = (CASE WHEN $2 = 'complained'   THEN "complained"   + 1 ELSE "complained"   END),
    stored       = (CASE WHEN $2 = 'stored'       THEN "stored"       + 1 ELSE "stored"       END)

  WHERE mailgun_id = $1
)

INSERT INTO emails_events (email, event, created_at, recipient)
VALUES
(
  (
    SELECT id from emails WHERE mailgun_id = $1
  ),
  $2::email_event,
  to_timestamp($3),
  $4
)
