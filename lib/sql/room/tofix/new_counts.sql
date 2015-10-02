SELECT (SELECT COUNT(*)
FROM messages_ack
WHERE room_id IN
    (SELECT id
     FROM rooms
     WHERE room = $1
    )
    AND user_id = $2
    AND read = false) AS badge_count;
