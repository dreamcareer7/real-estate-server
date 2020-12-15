SELECT
  google_contacts.*, 'google_contact' AS type
FROM
  google_contacts
JOIN 
  unnest($1::uuid[]) WITH ORDINALITY t(gcid, ord)
ON 
  google_contacts.id = gcid
ORDER BY 
  google_contacts.created_at DESC