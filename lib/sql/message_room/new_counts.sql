SELECT
    SUM(CASE WHEN video_url IS NOT NULL THEN 1 ELSE 0 END)::INT AS new_videos_count,
    SUM(CASE WHEN document_url IS NOT NULL THEN 1 ELSE 0 END)::INT AS new_documents_count,
    SUM(CASE WHEN image_url IS NOT NULL THEN 1 ELSE 0 END)::INT AS new_images_count,
    SUM(CASE WHEN TRUE THEN 1 ELSE 0 END)::INT as new_comments_count
FROM messages
INNER JOIN messages_ack
ON messages.id = messages_ack.message_id AND
   messages_ack.user_id = $2
WHERE message_room = $1 AND
      messages_ack.read = FALSE
