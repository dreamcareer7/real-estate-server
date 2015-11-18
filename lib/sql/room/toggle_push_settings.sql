UPDATE rooms_users
SET push_enabled = $3
WHERE "user" = $1 AND
      room = $2
