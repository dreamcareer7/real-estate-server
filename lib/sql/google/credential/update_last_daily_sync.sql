UPDATE
  google_credentials
SET
  last_daily_sync = now()
WHERE
  id = $1
RETURNING id