UPDATE
  microsoft_messages
SET
  is_read = $2
WHERE
  id = ANY($1)
RETURNING
  thread_key