SELECT
  microsoft_contacts.*, 'microsoft_contact' AS type
FROM
  microsoft_contacts
JOIN 
  unnest($1::uuid[]) WITH ORDINALITY t(gcid, ord)
ON 
  microsoft_contacts.id = gcid
ORDER BY 
  microsoft_contacts.created_at DESC