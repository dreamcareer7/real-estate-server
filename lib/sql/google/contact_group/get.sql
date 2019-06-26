SELECT 
  id 
FROM
  google_contact_groups
WHERE
  google_credential = $1
  AND entry_id = $2
  AND deleted_at IS NULL