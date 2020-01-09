INSERT INTO microsoft_calendars
  (
    microsoft_credential,
    calendar_id,
    summary,
    summary_override,
    description,
    location,
    time_zone,
    access_role,
    selected,
    deleted,
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
    $14,
    $15
  )
ON CONFLICT (microsoft_credential, calendar_id) DO UPDATE SET
  summary = $3,
  summary_override = $4,
  description = $5,
  location = $6,
  time_zone = $7,
  access_role = $8,
  selected = $9,
  deleted = $10,
  "primary" = $11,
  defaultReminders = $12,
  notificationSettings = $13,
  conference_properties = $14,
  origin = $15,
  updated_at = now()
RETURNING id