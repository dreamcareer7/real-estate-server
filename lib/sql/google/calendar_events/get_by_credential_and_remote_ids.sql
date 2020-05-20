SELECT
  id
FROM
  google_calendar_events
WHERE
  google_credential = $1
  AND event_id = ANY($2::text[])