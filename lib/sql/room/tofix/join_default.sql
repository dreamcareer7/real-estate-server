INSERT INTO rooms_users(room, "user")
SELECT id, $1 AS "user"
FROM rooms
WHERE room_type = 'Shortlist'
AND room = $2
