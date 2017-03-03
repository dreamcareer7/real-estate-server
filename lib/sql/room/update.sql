UPDATE rooms
SET title = $1,
    owner = $2,
    room_type = $3,
    updated_at = CLOCK_TIMESTAMP()
WHERE id = $4
