UPDATE
  crm_tasks
SET
  deleted_at = CLOCK_TIMESTAMP(),
  deleted_by = $2::uuid
WHERE
  id = $1
  AND deleted_at IS NULL
