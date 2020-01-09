SELECT
  calendar_id
FROM
  microsoft_calendars
WHERE
  id IN (
    SELECT
      rechat_gcalendar
    FROM
      microsoft_credentials
    WHERE
      email = $1
      AND brand <> $2
  )