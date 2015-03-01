SELECT message_room
FROM message_rooms_users
INNER JOIN message_rooms
    ON message_rooms_users.message_room = message_rooms.id
WHERE "user" = $1
    AND message_rooms.shortlist = $2
    AND CASE $3 WHEN 'Shortlist' THEN message_rooms.message_room_type = 'Shortlist'
                WHEN 'OneToOneMessaging' THEN message_rooms.message_room_type = 'OneToOneMessaging'
                WHEN 'Comment' THEN message_rooms.message_room_type = 'Comment'
                WHEN 'GroupMessaging' THEN message_rooms.message_room_type = 'GroupMessaging'
                WHEN 'Message' THEN message_rooms.message_room_type = 'Shortlist' OR message_rooms.message_room_type = 'OneToOneMessaging' OR message_rooms.message_room_type = 'GroupMessaging'
                ELSE TRUE
        END
