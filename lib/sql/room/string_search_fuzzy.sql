WITH r AS (
  SELECT rooms_users.room AS id,
         (
           COALESCE(SIMILARITY(rooms.title, $2), 0) +
           COALESCE(SIMILARITY(STRING_AGG(users.first_name, ' '), $2), 0) +
           COALESCE(SIMILARITY(STRING_AGG(users.last_name, ' '), $2), 0) +
           COALESCE(SIMILARITY(STRING_AGG(users.email, ' '), $2), 0) +
           COALESCE(SIMILARITY(STRING_AGG(users.phone_number, ' '), $2), 0)
         ) / 5.0 AS sim,
         ARRAY_AGG(rooms_users."user") AS users
  FROM rooms_users
  INNER JOIN users
    ON rooms_users."user" = users.id
  INNER JOIN rooms
    ON rooms_users."room" = rooms.id
  WHERE rooms.deleted_at IS NULL AND
        CASE WHEN $5::room_type[] IS NULL THEN TRUE ELSE ARRAY[rooms.room_type]::room_type[] <@ $5::room_type[] END
  GROUP BY rooms_users.room,
           rooms.title
  ORDER BY sim DESC
)
SELECT id,
       (COUNT(*) OVER())::INT AS total
FROM r
WHERE $1 = ANY (r.users) AND
      sim >= $4
LIMIT $3
