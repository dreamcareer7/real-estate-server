SELECT message_room
FROM message_rooms_users
WHERE "user" = $1
