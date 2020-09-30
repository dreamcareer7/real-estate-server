WITH inserted AS (
  INSERT INTO emails_events (email, event, created_at, recipient, url, ip, client_os, client_type, device_type, location, object)
  VALUES
  (
    (
      SELECT id FROM emails WHERE id = $1::uuid
    ),
    $2::email_event,
    to_timestamp($3),
    $4,
    $5,
    $6,
    $7,
    $8,
    $9,
    $10,
    $11
  )
  RETURNING id
),

campaignx AS (
  SELECT campaign FROM emails WHERE id = $1::uuid
)

SELECT
  t1.id AS email_event_id, t2.campaign AS campaign_id
FROM
  inserted t1 CROSS JOIN campaignx t2