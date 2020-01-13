SELECT
  calendar_id
FROM
  google_calendars
WHERE
  id IN (
    SELECT
      google_calendar
    FROM
      google_credentials
    WHERE
      email = $1
      AND brand <> $2
  )