SELECT
    SUM(CASE WHEN video_url IS NOT NULL THEN 1 ELSE 0 END)::INT AS new_video_count,
    SUM(CASE WHEN document_url IS NOT NULL THEN 1 ELSE 0 END)::INT AS new_document_count,
    SUM(CASE WHEN image_url IS NOT NULL THEN 1 ELSE 0 END)::INT AS new_image_count,
    SUM(CASE WHEN (image_url IS NULL AND video_url IS NULL AND document_url IS NULL) THEN 1 ELSE 0 END)::INT as new_comment_count
FROM messages
INNER JOIN messages_ack
ON messages.id = messages_ack.message_id AND
   messages_ack.user_id = $2
WHERE message_room = $1 AND
      messages_ack.read = FALSE
