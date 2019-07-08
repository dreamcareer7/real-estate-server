UPDATE
  microsoft_credentials
SET
  revoked = TRUE,
  sync_status = NULL,
  last_sync_at = NULL,
  contacts_last_sync_at = NULL
WHERE
  id = $1