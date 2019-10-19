UPDATE
  google_calendar_events
SET
  description = $2,
  summary = $3,
  location = $4,
  color_id = $5,
  transparency = $6,
  visibility = $7,
  status = $8,
  sequence = $9,
  anyone_can_add_self = $10,
  guests_can_invite_others = $11,
  guests_can_modify = $12,
  guests_can_see_other_guests = $13,
  attendees_omitted = $14,
  attendees = $15,
  attachments = $16,
  conference_data = $17,
  extended_properties = $18,
  gadget = $19,
  reminders = $20,
  source = $21,
  "start" = $22,
  "end" = $23,
  recurrence = $24,
  original_start_time = $25
WHERE
  id = $1