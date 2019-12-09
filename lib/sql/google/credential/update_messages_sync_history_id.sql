UPDATE
  google_credentials
SET
  messages_sync_history_id = $2
WHERE
  id = $1