UPDATE
  google_credentials
SET
  rechat_gcalendar = $2,
  updated_at = now()
WHERE
  id = $1