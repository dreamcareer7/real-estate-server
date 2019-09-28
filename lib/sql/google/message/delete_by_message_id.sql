UPDATE
  google_messages
SET
  deleted_at = now()
WHERE
  google_credential = $1
  AND message_id = ANY($2)