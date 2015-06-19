UPDATE message_rooms
SET message_room_status = 'Inactive'
WHERE id = $1
