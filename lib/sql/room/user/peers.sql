SELECT DISTINCT "user"
FROM rooms_users
WHERE room IN (
  SELECT DISTINCT room FROM rooms_users WHERE "user" = $1
)