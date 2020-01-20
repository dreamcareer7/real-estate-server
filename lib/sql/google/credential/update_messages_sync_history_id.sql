UPDATE
  google_credentials
SET
  messages_sync_history_id = $2,
  watcher_exp = COALESCE ($3, watcher_exp)::BIGINT
WHERE
  id = $1