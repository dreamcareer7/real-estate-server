SELECT id
FROM rooms
WHERE room = $1
    AND room_type = 'Shortlist'
LIMIT 1;
