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
    access_role,
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
    $9,
    $10
  )
ON CONFLICT (google_credential, calendar_id) DO UPDATE SET
  summary = $3,
  summary_override = $4,
  description = $5,
  location = $6,
  time_zone = $7,
  conference_properties = $8,
  access_role = $9,
  origin = $10,
  updated_at = now(),
  deleted_at = null
RETURNING id