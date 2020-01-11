UPDATE
  microsoft_credentials
SET
  microsoft_calendar = $2,
  updated_at = now()
WHERE
  id = $1