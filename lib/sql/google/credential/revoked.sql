UPDATE
  google_credentials
SET
  revoked = TRUE,
  last_sync_at = NULL,
  contacts_sync_token = NULL,
  contact_groups_sync_token = NULL,
  messages_sync_history_id = NULL,
  threads_sync_history_id = NULL
WHERE
  id = $1