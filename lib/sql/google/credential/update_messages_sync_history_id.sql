UPDATE
  google_credentials
SET
  messages_sync_history_id = $2,
  updated_at = $3
WHERE
  id = $1