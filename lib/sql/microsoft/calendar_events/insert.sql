INSERT INTO microsoft_calendar_events
  (
    microsoft_credential,
    microsoft_calendar,
    event_id,
    subject,
    type,
    body_preview,
    created_date_time,
    original_start,
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
    $36,
    $37,
    $38,
    $39
  )
ON CONFLICT (microsoft_credential, microsoft_calendar, event_id) DO UPDATE SET
    subject = $1,
    type = $2,
    body_preview = $3,
    created_date_time = $4,
    original_start = $5,
    last_modified_date_time = $6,
    original_end_time_zone = $7,
    original_start_time_zone = $8,
    event_start = $9,
    event_end = $10,
    location = $11,
    locations = $12,
    organizer = $13,
    recurrence = $14,
    body = $15,
    attendees = $16,
    categories = $17,
    response_status = $18,
    has_attachments = $19,
    is_all_day = $20,
    is_cancelled = $21,
    is_organizer = $22,
    is_reminderOn = $23,
    response_requested = $24,
    change_key = $25,
    ical_uid = $26,
    importance = $27,
    online_meeting_url = $28,
    reminder_minutes_before_start = $29,
    sensitivity = $30,
    series_masterId = $31,
    show_as = $32,
    web_link = $33,
    origin = $34
  updated_at = now(),
  deleted_at = null
RETURNING id