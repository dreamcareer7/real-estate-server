UPDATE
  microsoft_contact_folders
SET
  sync_token = $1
WHERE
  microsoft_credenial = $2
  AND folder_id = $3
