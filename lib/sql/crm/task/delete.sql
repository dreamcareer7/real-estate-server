UPDATE
  crm_tasks
SET
  deleted_at = CLOCK_TIMESTAMP(),
  deleted_by = $2::uuid
WHERE
  id = ANY($1::uuid[])
  AND deleted_at IS NULL
