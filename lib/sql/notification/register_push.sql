WITH
rm_null_ids AS
(
  DELETE FROM notifications_tokens WHERE device_id IS NULL AND "user" = $1
),
rm_dup_ids AS
(
  DELETE FROM notifications_tokens WHERE device_id = $2
),
rm_dup_tokens AS
(
  DELETE FROM notifications_tokens WHERE device_token = $3
)
INSERT INTO notifications_tokens
(
  "user",
  device_id,
  device_token
)
VALUES ($1, $2, $3)
ON CONFLICT ("user", device_id) DO UPDATE SET
  device_token = $3
  WHERE notifications_tokens."user" = $1 AND notifications_tokens.device_id = $2;
