UPDATE
  google_credentials
SET
  google_calendar = $2,
  updated_at = now()
WHERE
  id = $1