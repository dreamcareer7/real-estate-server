SELECT device_token
FROM notifications_tokens
WHERE "user" = $1
