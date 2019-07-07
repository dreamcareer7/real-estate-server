UPDATE
  contacts
SET
  deleted_at = NULL,
  deleted_by = NULL,
  deleted_within = NULL,
  deleted_for = NULL
WHERE
  id = ANY($1::uuid[])
