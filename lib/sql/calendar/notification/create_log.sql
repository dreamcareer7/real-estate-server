INSERT INTO calendar_notification_logs (
  id,
  "timestamp",
  "user"
)
VALUES (
  $1,
  to_timestamp($2),
  $3
)
