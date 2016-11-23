UPDATE rooms_users
SET archived = TRUE
WHERE room = $1 AND
      "user" = $2
