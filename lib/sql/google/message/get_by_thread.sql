SELECT
  id, message_id
FROM
  google_messages
WHERE 
  google_credential = $1
  AND thread_id = $2
ORDER BY 
  google_messages.message_created_at DESC