UPDATE rooms_users
SET notification_setting = $3
WHERE "user" = $1 AND
      room = $2
