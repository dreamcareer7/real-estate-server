INSERT INTO emails_events (email, event, created_at, recipient)
VALUES
(
  (
    SELECT id from emails WHERE mailgun_id = $1
  ),
  $2,
  to_timestamp($3),
  $4
)