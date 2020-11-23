UPDATE
  microsoft_contact_folders
SET
  deleted_at = now()
WHERE
  microsoft_credential = $1