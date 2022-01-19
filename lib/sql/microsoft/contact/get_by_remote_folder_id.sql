SELECT
  remote_id
FROM
  microsoft_contacts
WHERE 
  microsoft_credential = $1
  AND deleted_at IS NULL 
  AND "data" ->> 'parentFolderId' = ANY($2)