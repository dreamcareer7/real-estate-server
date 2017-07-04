INSERT INTO notifications_tokens
(
  "user",
  channel
)
VALUES ($1, $2)
ON CONFLICT DO NOTHING
