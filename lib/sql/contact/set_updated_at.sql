UPDATE
  contacts
SET
  updated_at = NOW(),
  updated_by = $2::uuid,
  updated_within = $3,
  updated_for = $4
WHERE
  id = ANY($1::uuid[])
