UPDATE
  google_credentials
SET
  threads_sync_history_id = $2,
  updated_at = $3
WHERE
  id = $1