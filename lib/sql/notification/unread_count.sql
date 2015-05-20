SELECT COUNT(*) AS total_count
FROM messages_ack
WHERE user_id = $1
AND read = FALSE
