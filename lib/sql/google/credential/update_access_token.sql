UPDATE
  google_credentials
SET
  access_token = $2,
  expiry_date = $3,
  updated_at = now()
WHERE
  id = $1