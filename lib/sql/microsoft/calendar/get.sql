SELECT
  microsoft_calendars.*, 'microsoft_calendars' AS type
FROM
  microsoft_calendars
JOIN 
  unnest($1::uuid[]) WITH ORDINALITY t(mcid, ord)
ON 
  microsoft_calendars.id = mcid
ORDER BY 
  microsoft_calendars.created_at DESC