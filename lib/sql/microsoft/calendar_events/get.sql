SELECT
    microsoft_calendar_events.*, 'microsoft_calendar_events' AS type
FROM
    microsoft_calendar_events
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(gceid, ord)
ON 
    microsoft_calendar_events.id = gceid
ORDER BY 
    microsoft_calendar_events.created_at DESC