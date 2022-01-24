SELECT 
	event_id as id
FROM 
	microsoft_calendar_events
WHERE 
	microsoft_credential = $1
	AND microsoft_calendar = $2
	AND series_master_id = $3
	AND deleted_at IS NULL
	AND (
	(
			event_start->>'dateTime')::date  < $4::date
		OR 
			(event_start->>'dateTime')::date > $5::date
	)