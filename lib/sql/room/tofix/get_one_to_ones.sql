SELECT room
FROM rooms_users
INNER JOIN rooms
    ON rooms_users.room = rooms.id
WHERE "user" = $1
    AND rooms.room = $2
    AND rooms.room_type = 'OneToOneMessaging'
    ORDER BY rooms.created_at DESC;
