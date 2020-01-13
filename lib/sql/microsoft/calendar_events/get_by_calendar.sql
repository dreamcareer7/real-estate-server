SELECT
  id
FROM
  microsoft_calendar_events
WHERE
  microsoft_credential = $1
  AND microsoft_calendar = $2
  AND deleted_at IS NULL