SELECT (rooms_users.push_enabled) AS ok
FROM rooms_users
WHERE rooms_users."user" = $1 AND
      rooms_users.room = $2
