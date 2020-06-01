UPDATE
  microsoft_credentials
SET
  revoked = TRUE,
  deleted_at = now()
WHERE
  id = $1