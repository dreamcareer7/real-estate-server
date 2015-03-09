SELECT message_room
FROM message_rooms_users
INNER JOIN message_rooms
    ON message_rooms_users.message_room = message_rooms.id
WHERE "user" = $1
    AND message_rooms.shortlist = $2
    AND message_rooms.message_room_type = 'OneToOneMessaging'
    ORDER BY message_rooms.created_at DESC;
