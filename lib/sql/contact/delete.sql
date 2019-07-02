UPDATE
  contacts
SET
  deleted_at = now(),
  deleted_by = $2::uuid,
  deleted_within = $3,
  deleted_for = $4
WHERE
  id = ANY($1::uuid[])
