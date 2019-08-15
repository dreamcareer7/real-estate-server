SELECT
  id
FROM
  microsoft_messages
WHERE 
  AND microsoft_credential = $1,
  AND thread_id = $2
ORDER BY 
  microsoft_messages.message_created_at DESC