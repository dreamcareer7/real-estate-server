SELECT
  calendar_id
FROM
  google_calendars
WHERE
  id IN (
    SELECT
      rechat_gcalendar
    FROM
      google_credentials
    WHERE
      email = $1
      AND brand <> $2
  )