UPDATE
  microsoft_credentials
SET
  revoked = TRUE,
  sync_status = NULL
WHERE
  id = $1