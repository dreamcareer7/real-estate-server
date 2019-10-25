SELECT
    google_calendar_events.*, 'google_calendar_events' AS type
FROM
    google_calendar_events
JOIN 
    unnest($2::text[]) WITH ORDINALITY t(gced, ord)
ON 
    google_calendar_events.calendar_id = gced
    AND google_calendar_events.google_calendar = $1
    AND google_calendar_events.google_credential = $3
ORDER BY 
    google_calendar_events.created_at DESC