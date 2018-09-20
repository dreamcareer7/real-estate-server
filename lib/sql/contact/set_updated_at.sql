UPDATE
  contacts
SET
  updated_at = NOW(),
  updated_by = $2::uuid
WHERE
  id = ANY($1::uuid[])