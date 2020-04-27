WITH insert AS (
  INSERT INTO emails_events (email, event, created_at, recipient, object)
  VALUES
  (
    (
      SELECT id FROM emails WHERE mailgun_id = $1
    ),
    $2::email_event,
    to_timestamp($3),
    $4,
    $5
  )
)

SELECT campaign FROM emails WHERE mailgun_id = $1
