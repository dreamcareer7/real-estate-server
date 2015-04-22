SELECT
    SUM(CASE WHEN video_url IS NOT NULL THEN 1 ELSE 0 END) AS new_video_count,
    SUM(CASE WHEN document_url IS NOT NULL THEN 1 ELSE 0 END) AS new_document_count,
    SUM(CASE WHEN image_url IS NOT NULL THEN 1 ELSE 0 END) AS new_image_count,
    SUM(CASE WHEN TRUE THEN 1 ELSE 0 END) as new_comment_count
FROM messages
INNER JOIN messages_ack
ON messages.id = messages_ack.message_id AND
   messages_ack.user_id = $1
WHERE message_room = $2 AND
      messages_ack.read = FALSE
