UPDATE
  microsoft_messages
SET
  deleted_at = now()
WHERE
  id = ANY($1::uuid[])
RETURNING
  thread_key