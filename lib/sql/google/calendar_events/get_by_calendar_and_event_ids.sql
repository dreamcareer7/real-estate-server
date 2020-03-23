SELECT
  id
FROM
  google_calendar_events
JOIN 
  unnest($3::text[]) WITH ORDINALITY t(gc_ei, ord)
ON 
  google_calendar_events.google_credential = $1
  AND google_calendar_events.google_calendar = $2
  AND google_calendar_events.event_id = gc_ei
ORDER BY 
  t.ord