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
      email = (SELECT email FROM google_credentials WHERE id = $1)
      AND brand <> (SELECT brand FROM google_credentials WHERE id = $1)
  )