UPDATE
  showings
SET
  deleted_at = now(),
  deleted_by = $2::uuid
WHERE
  id = $1::uuid;
