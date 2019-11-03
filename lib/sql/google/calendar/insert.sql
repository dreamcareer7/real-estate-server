INSERT INTO google_calendars
  (
    google_credential,
    calendar_id,
    summary,
    summary_override,
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
    $8,
    $9
  )
ON CONFLICT (google_credential, calendar_id) DO UPDATE SET
  summary = $3,
  summary_override = $4,
  description = $5,
  location = $6,
  time_zone = $7,
  conference_properties = $8,
  origin = $9,
  updated_at = now(),
  deleted_at = null
RETURNING id