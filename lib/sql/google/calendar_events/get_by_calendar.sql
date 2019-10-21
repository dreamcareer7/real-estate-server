SELECT
  id
FROM
  google_calendar_events
WHERE
  google_credential = $1
  AND google_calendar = $2
  AND deleted_at IS NULL