SELECT id
FROM message_rooms
WHERE shortlist = $1
    AND message_room_type = 'Shortlist'
LIMIT 1;
