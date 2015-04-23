SELECT (SELECT COUNT(*)
FROM messages_ack
WHERE message_room_id IN
    (SELECT id
     FROM message_rooms
     WHERE shortlist = $1
    )
    AND user_id = $2
    AND read = false) AS badge_count;
