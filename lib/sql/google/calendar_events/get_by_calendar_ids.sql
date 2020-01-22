SELECT
  id
FROM
  google_calendar_events
WHERE
  google_credential = $1
  AND google_calendar = ANY($2::uuid[])