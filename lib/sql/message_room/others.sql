SELECT "user"
FROM message_rooms_users
WHERE message_room = $1
AND "user" <> $2
