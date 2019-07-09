UPDATE
  microsoft_credentials
SET
  contacts_last_extract_at = $2,
  updated_at = $2
WHERE
  id = $1