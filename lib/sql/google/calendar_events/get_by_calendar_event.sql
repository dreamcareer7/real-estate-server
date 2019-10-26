SELECT
  id
FROM
  google_calendar_events
WHERE
  google_credential = $1
  AND google_calendar = $2
  AND event_id = $3
  AND deleted_at IS NULL