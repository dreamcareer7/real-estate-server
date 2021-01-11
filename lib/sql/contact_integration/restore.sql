UPDATE
  contact_integration
SET
  deleted_at = null,
  updated_at = now()
WHERE
  id = ANY($1::uuid[])