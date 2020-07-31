UPDATE
  microsoft_credentials
SET
  revoked = TRUE
WHERE
  id = $1