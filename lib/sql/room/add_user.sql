
INSERT INTO rooms_users ("user", room, phone_handler)
VALUES (
  $1,
  $2,
  (
    SELECT id
    FROM seamless_phone_pool
    WHERE phone_number NOT IN (
      SELECT seamless_phone_pool.phone_number
      FROM rooms_users
      INNER JOIN seamless_phone_pool
      ON seamless_phone_pool.id = rooms_users.phone_handler
      WHERE "user" = $1
    )
    UNION (
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
)
