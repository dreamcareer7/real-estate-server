UPDATE
  microsoft_credentials
SET
  deleted_at = $2
WHERE
  id = $1