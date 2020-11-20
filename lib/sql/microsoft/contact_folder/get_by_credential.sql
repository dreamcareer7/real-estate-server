SELECT
  id, microsoft_credential, folder_id, parent_folder_id, display_name
FROM
  microsoft_contact_folders
WHERE
  microsoft_credential = $1
  AND deleted_at IS NULL