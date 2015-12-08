SELECT device_token
FROM notification_tokens
WHERE "user" = $1
