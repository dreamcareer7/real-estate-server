SELECT
  microsoft_calendars.*, 'microsoft_calendars' AS type
FROM
  microsoft_calendars
JOIN 
  unnest($1::uuid[]) WITH ORDINALITY t(gcid, ord)
ON 
  microsoft_calendars.id = gcid
ORDER BY 
  microsoft_calendars.created_at DESC