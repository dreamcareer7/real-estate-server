UPDATE
  google_calendars
SET
  summary = $2,
  description = $3,
  location = $4,
  time_zone = $5,
WHERE
  id = $1