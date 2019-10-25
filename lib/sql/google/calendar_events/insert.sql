INSERT INTO google_calendar_events
  (
    google_credential,
    google_calendar,
    event_id NOT NULL,

    description,
    summary,
    location,
    color_id,
    ical_uid,
    transparency,
    visibility,
    hangout_link,
    html_link,
    status,
    sequence,
    anyone_can_add_self,
    guests_can_invite_others,
    guests_can_modify,
    guests_can_see_other_guests,
    attendees_omitted,
    locked,
    private_copy,
    creator,
    organizer,
    attendees,
    attachments,
    conference_data,
    extended_properties,
    gadget,
    reminders,
    source,
    created,
    updated,
    "start",
    "end",
    end_time_unspecified,
    recurrence,
    recurring_eventId,
    original_start_time,
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
ON CONFLICT (google_credential, google_calendar, event_id) DO UPDATE SET
  summary = $3,
  description = $4,
  location = $5,
  time_zone = $6,
  conference_properties = $7,
  origin = $8,
  updated_at = now(),
  deleted_at = null
RETURNING id