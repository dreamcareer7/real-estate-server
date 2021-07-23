DELETE FROM notifications_tokens
WHERE "user" = $1 AND channel = $2 AND app = $3::notification_app
