UPDATE
  google_credentials
SET
  refresh_token = $2,
  updated_at = $3
WHERE
  id = $1