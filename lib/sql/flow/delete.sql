UPDATE
  flows
SET
  deleted_at = NOW(),
  deleted_by = $2::uuid
WHERE
  id = $1::uuid
