UPDATE
  crm_lists
SET
  deleted_at = clock_timestamp(),
  deleted_by = $2::uuid,
  deleted_within = $3,
  deleted_for = $4
WHERE
  id = ANY($1::uuid[])
