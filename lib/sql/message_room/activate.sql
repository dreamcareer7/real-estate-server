UPDATE message_rooms
SET message_room_status = 'Active'
WHERE id = $1
