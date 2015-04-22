INSERT INTO messages_ack(message_id,
                         message_room_id,
                         user_id)
    SELECT message_id,
           message_room_id,
           $2 AS user_id
    FROM messages_ack
    WHERE message_room_id = $1
    GROUP BY message_id,
             message_room_id,
             user_id
