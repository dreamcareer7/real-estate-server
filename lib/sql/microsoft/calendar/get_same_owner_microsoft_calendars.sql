SELECT
  calendar_id
FROM
  microsoft_calendars
WHERE
  id IN (
    SELECT
      microsoft_calendar
    FROM
      microsoft_credentials
    WHERE
      email = $1
      AND brand <> $2
  )