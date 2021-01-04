UPDATE
  google_contacts
SET
  deleted_at = null,
  updated_at = now()
WHERE
  id = ANY($1::uuid[])