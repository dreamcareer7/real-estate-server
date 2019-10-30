UPDATE
  google_messages
SET
  is_read = $2
WHERE
  id = $1