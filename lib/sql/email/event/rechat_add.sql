WITH inserted AS (
  INSERT INTO emails_events (email, event, created_at, occured_at, recipient, url, ip, client_os, client_type, device_type, location, campaign)
  VALUES
  (
    (
      SELECT id FROM emails WHERE id = $1::uuid
    ),
    $2::email_event,
    to_timestamp($3),
    to_timestamp($3),
    $4,
    $5,
    $6,
    $7,
    $8,
    $9,
    $10,
    (
      SELECT emails.campaign FROM emails WHERE id = $1::uuid
    )
  )
  RETURNING id, created_at
),

current_campaign AS (
  SELECT campaign, sent_at FROM emails WHERE id = $1::uuid
)

SELECT
  t1.id AS email_event_id, t2.campaign AS campaign_id, EXTRACT(EPOCH FROM(t1.created_at - t2.sent_at)) as sent_diff
FROM
  inserted t1 CROSS JOIN current_campaign t2


-- SELECT campaign FROM emails WHERE id = $1::uuid
