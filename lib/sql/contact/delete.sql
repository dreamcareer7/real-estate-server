UPDATE
  contacts
SET
  deleted_at = now(),
  deleted_by = $2::uuid
WHERE
  id = ANY($1::uuid[])
