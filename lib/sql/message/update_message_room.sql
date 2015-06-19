UPDATE message_rooms
SET updated_at = NOW(),
    message_room_status = 'Active'
WHERE id = $1
