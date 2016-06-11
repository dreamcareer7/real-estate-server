WITH deleted AS (
  DELETE FROM notification_tokens WHERE device_id IS NULL AND "user" = $1
)

INSERT INTO notification_tokens
(
  "user",
  device_id,
  device_token
)
VALUES ($1, $2, $3)
ON CONFLICT ("user", device_id) DO UPDATE SET
  device_token = $3
  WHERE notification_tokens."user" = $1 AND notification_tokens.device_id = $2;
