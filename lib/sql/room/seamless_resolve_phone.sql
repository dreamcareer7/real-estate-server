WITH u AS
(
  UPDATE rooms_users
  SET phone_handler =
  (
    SELECT id
    FROM seamless_phone_pool
    WHERE phone_number NOT IN
    (
      SELECT seamless_phone_pool.phone_number
      FROM rooms_users
      INNER JOIN seamless_phone_pool
      ON seamless_phone_pool.id = rooms_users.phone_handler
      WHERE "user" = $1
    )
    UNION
    (
      SELECT seamless_phone_pool.id
      FROM seamless_phone_pool
      INNER JOIN rooms_users
      ON seamless_phone_pool.id = rooms_users.phone_handler
      INNER JOIN rooms
      ON rooms.id = rooms_users.room
      WHERE rooms_users."user" = $1
      ORDER BY rooms.updated_at
      LIMIT 1
    )
    LIMIT 1
  )
  WHERE "user" = $1 AND
        room = $2 AND
        phone_handler IS NULL
  RETURNING phone_handler
)
SELECT seamless_phone_pool.phone_number AS phone_number
FROM rooms_users
INNER JOIN seamless_phone_pool
ON (rooms_users.phone_handler = seamless_phone_pool.id OR seamless_phone_pool.id = (SELECT phone_handler FROM u))
WHERE rooms_users."user" = $1 AND
      rooms_users.room = $2
LIMIT 1
