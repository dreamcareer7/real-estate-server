SELECT
  id
FROM
  microsoft_calendar_events
WHERE
  microsoft_credential = $1
  AND microsoft_calendar = ANY($2::uuid[])