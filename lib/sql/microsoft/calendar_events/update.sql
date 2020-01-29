UPDATE
  microsoft_calendar_events
SET
  subject = $2,
  type = $3,
  body_preview = $4,
  created_date_time = $5,
  original_start = $6,
  last_modified_date_time = $7,
  original_end_time_zone = $8,
  original_start_time_zone = $9,
  event_start = $10,
  event_end = $11,
  location = $12,
  locations = $13,
  organizer = $14,
  recurrence = $15,
  body = $16,
  attendees = $17,
  categories = $18,
  response_status = $19,
  has_attachments = $20,
  is_all_day = $21,
  is_cancelled = $22,
  is_organizer = $23,
  is_reminderOn = $24,
  response_requested = $25,
  change_key = $26,
  ical_uid = $27,
  importance = $28,
  online_meeting_url = $29,
  reminder_minutes_before_start = $30,
  sensitivity = $31,
  series_masterId = $32,
  show_as = $33,
  web_link = $34
WHERE
  id = $1
RETURNING id