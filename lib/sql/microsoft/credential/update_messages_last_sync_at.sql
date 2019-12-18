UPDATE
  microsoft_credentials
SET
  messages_last_sync_at = $2
WHERE
  id = $1