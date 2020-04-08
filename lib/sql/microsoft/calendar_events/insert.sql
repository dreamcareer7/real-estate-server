INSERT INTO microsoft_calendar_events
  (
    microsoft_credential,
    microsoft_calendar,
    event_id,
    subject,
    type,
    body_preview,
    created_date_time,
    last_modified_date_time,
    original_end_time_zone,
    original_start_time_zone,
    event_start,
    event_end,
    location,
    locations,
    organizer,
    recurrence,
    body,
    attendees,
    categories,
    response_status,
    has_attachments,
    is_all_day,
    is_cancelled,
    is_organizer,
    is_reminderOn,
    response_requested,
    change_key,
    ical_uid,
    importance,
    online_meeting_url,
    reminder_minutes_before_start,
    sensitivity,
    series_masterId,
    show_as,
    web_link,
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
    $15,
    $16,
    $17,
    $18,
    $19,
    $20,
    $21,
    $22,
    $23,
    $24,
    $25,
    $26,
    $27,
    $28,
    $29,
    $30,
    $31,
    $32,
    $33,
    $34,
    $35,
    $36
  )
ON CONFLICT (microsoft_credential, microsoft_calendar, event_id) DO UPDATE SET
  subject = $4,
  type = $5,
  body_preview = $6,
  created_date_time = $7,
  last_modified_date_time = $8,
  original_end_time_zone = $9,
  original_start_time_zone = $10,
  event_start = $11,
  event_end = $12,
  location = $13,
  locations = $14,
  organizer = $15,
  recurrence = $16,
  body = $17,
  attendees = $18,
  categories = $19,
  response_status = $20,
  has_attachments = $21,
  is_all_day = $22,
  is_cancelled = $23,
  is_organizer = $24,
  is_reminderOn = $25,
  response_requested = $26,
  change_key = $27,
  ical_uid = $28,
  importance = $29,
  online_meeting_url = $30,
  reminder_minutes_before_start = $31,
  sensitivity = $32,
  series_masterId = $33,
  show_as = $34,
  web_link = $35,
  origin = $36,
  updated_at = now(),
  deleted_at = null
RETURNING id