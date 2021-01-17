SELECT
  contact_integration.*, 'contact_integration' AS type
FROM
  contact_integration
JOIN 
  unnest($1::uuid[]) WITH ORDINALITY t(gcid, ord)
ON 
  contact_integration.id = gcid
ORDER BY 
  contact_integration.created_at DESC