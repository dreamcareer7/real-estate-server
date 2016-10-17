SELECT rooms_users.room AS id
FROM rooms_users
INNER JOIN seamless_phone_pool
ON rooms_users.phone_handler = seamless_phone_pool.id
INNER JOIN rooms
ON rooms_users.room = rooms.id
WHERE rooms_users."user" = $1 AND
      seamless_phone_pool.phone_number = $2
ORDER BY rooms.updated_at DESC
LIMIT 1
