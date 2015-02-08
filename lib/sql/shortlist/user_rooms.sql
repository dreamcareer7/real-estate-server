SELECT message_room
FROM message_rooms_users
INNER JOIN message_rooms
    ON message_rooms_users.message_room = message_rooms.id
WHERE "user" = $1
    AND message_rooms.shortlist = $2;
