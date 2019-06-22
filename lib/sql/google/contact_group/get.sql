SELECT 
  id 
FROM
  google_contact_groups
WHERE
  google_credential = $1
  AND resource_name = $2
  AND deleted_at IS NULL