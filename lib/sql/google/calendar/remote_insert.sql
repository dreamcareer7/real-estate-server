INSERT INTO google_calendars
  (
    google_credential,
    calendar_id,
    summary,
    summary_override,
    description,
    location,
    time_zone,
    accessRole,
    selected,
    "primary",
    defaultReminders,
    notificationSettings,
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
    $9,
    $10,
    $11,
    $12,
    $13,
    $14
  )
ON CONFLICT (google_credential, calendar_id) DO UPDATE SET
  summary = $3,
  summary_override = $4,
  description = $5,
  location = $6,
  time_zone = $7,
  accessRole = $8,
  selected = $9,
  "primary" = $10,
  defaultReminders = $11,
  notificationSettings = $12,
  conference_properties = $13,
  origin = $14,
  updated_at = now()
RETURNING id