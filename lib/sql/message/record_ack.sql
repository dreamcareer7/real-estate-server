INSERT INTO messages_ack(
                message_room_id,
                message_id,
                user_id
            )
VALUES ($1, $2, $3)
