SELECT DISTINCT(channel)
FROM notifications_tokens
WHERE "user" = $1
