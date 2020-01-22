SELECT
    google_calendar_events.*, 'google_calendar_events' AS type
FROM
    google_calendar_events
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(gceid, ord)
ON 
    google_calendar_events.id = gceid
ORDER BY 
    google_calendar_events.created_at DESC