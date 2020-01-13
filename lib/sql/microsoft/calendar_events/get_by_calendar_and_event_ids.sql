SELECT
  id
FROM
  microsoft_calendar_events
JOIN 
  unnest($3::text[]) WITH ORDINALITY t(gc_ei, ord)
ON 
  microsoft_calendar_events.event_id = gc_ei
  AND microsoft_calendar_events.microsoft_credential = $1
  AND microsoft_calendar_events.microsoft_calendar = $2
ORDER BY 
  t.ord