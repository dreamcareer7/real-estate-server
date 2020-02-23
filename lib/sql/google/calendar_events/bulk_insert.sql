INSERT INTO google_calendar_events (
  summary
)
SELECT
  summary
FROM json_populate_recordset(NULL::google_calendar_events, $1::json)
ON CONFLICT (google_credential, google_calendar, event_id) DO UPDATE SET
  deleted_at = null
RETURNING id