SELECT "user"
FROM rooms_users
WHERE room = $1 AND
      "user" <> $2
