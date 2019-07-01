SELECT
  id, microsoft_credential, entry_id, entry
FROM
  microsoft_contact_folders
WHERE
  microsoft_credential = $1
  AND deleted_at IS NULL