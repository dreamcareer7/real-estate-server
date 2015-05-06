DELETE FROM notification_tokens
WHERE "user" = $1 AND
      device_token = $2
