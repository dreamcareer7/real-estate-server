WITH insert AS (
  INSERT INTO emails_events (email, event, created_at, recipient, object)
  VALUES
  (
    (
      SELECT id::uuid FROM COALESCE((SELECT id FROM emails WHERE mailgun_id = $1::text), (SELECT id FROM emails WHERE id = $1::uuid)) AS id
    ),
    $2::email_event,
    to_timestamp($3),
    $4,
    $5
  )
)

SELECT campaign::uuid FROM COALESCE((SELECT campaign FROM emails WHERE mailgun_id = $1::text), (SELECT campaign FROM emails WHERE id = $1::uuid)) AS campaign
