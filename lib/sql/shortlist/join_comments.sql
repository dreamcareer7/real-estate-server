INSERT INTO message_rooms_users(message_room, "user")
SELECT id, $1 AS "user"
FROM message_rooms
WHERE message_room_type = 'Comment'
AND shortlist = $2
