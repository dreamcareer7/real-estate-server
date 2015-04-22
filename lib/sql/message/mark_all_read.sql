UPDATE messages_ack
SET read = TRUE
WHERE message_room_id = $1 AND
      user_id = $2
