SELECT seamless_phone_pool.phone_number AS phone_number
FROM rooms_users
INNER JOIN seamless_phone_pool
ON rooms_users.phone_handler = seamless_phone_pool.id
WHERE rooms_users."user" = $1 AND
      rooms_users.room = $2
LIMIT 1
