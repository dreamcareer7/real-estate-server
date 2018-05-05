DELETE FROM notifications_tokens
WHERE "user" = $1
AND   channel = ANY($2) 