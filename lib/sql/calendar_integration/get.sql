SELECT
  calendar_integration.*, 'calendar_integration' AS type
FROM
  calendar_integration
JOIN 
  unnest($1::uuid[]) WITH ORDINALITY t(gcid, ord)
ON 
  calendar_integration.id = gcid
ORDER BY 
  calendar_integration.created_at DESC