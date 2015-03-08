UPDATE message_rooms
SET updated_at = NOW()
WHERE id = $1
