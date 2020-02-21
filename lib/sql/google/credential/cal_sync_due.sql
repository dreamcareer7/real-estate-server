SELECT
  id
FROM 
  google_credentials
WHERE
  (calendars_last_sync_at <= (NOW() - $1::interval) OR calendars_last_sync_at IS NULL)
  AND revoked IS FALSE
  AND deleted_at IS NULL
  AND google_calendar IS NOT NULL