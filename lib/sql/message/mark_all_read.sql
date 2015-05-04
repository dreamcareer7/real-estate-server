DELETE from messages_ack
WHERE message_room_id = $1 AND
      user_id = $2
