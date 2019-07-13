SELECT 
  id 
FROM
  microsoft_contact_folders
WHERE
  microsoft_credential = $1
  AND folder_id = $2
  AND deleted_at IS NULL