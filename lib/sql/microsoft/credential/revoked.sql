UPDATE
  microsoft_credentials
SET
  revoked = TRUE,
  sync_status = NULL,
  deleted_at = now()
WHERE
  id = $1