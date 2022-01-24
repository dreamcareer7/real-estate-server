SELECT 
	id
FROM 
	microsoft_calendar_events
WHERE 
	microsoft_credential = $1
	AND microsoft_calendar = $2
	AND series_master_id = $3
	AND deleted_at IS NULL
	AND (
	(
			event_start->>'dateTime')::timestamp with time zone  > $4::timestamp with time zone
		OR 
			(event_start->>'dateTime')::timestamp with time zone < $5::timestamp with time zone
	)