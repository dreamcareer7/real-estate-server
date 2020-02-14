UPDATE
  google_credentials
SET
  refresh_token = $2,
  updated_at = now()
WHERE
  id = $1