INSERT INTO google_calendars
  (
    google_credential,
    calendar_id,
    summary,
    description,
    location,
    time_zone,
    conference_properties,
    origin
  )
VALUES
  (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8
  )
ON CONFLICT (google_credential, calendar_id) DO UPDATE SET
  summary = $3,
  description = $4,
  location = $5,
  time_zone = $6,
  conference_properties = $7,
  origin = $8,
  updated_at = now(),
  deleted_at = null
RETURNING id