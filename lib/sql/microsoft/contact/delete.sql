UPDATE
  microsoft_contacts
SET
  deleted_at = now(),
  updated_at = now()
WHERE
  id = ANY($1::uuid[])