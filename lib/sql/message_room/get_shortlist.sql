SELECT shortlist
FROM message_rooms
WHERE id = $1
LIMIT 1
