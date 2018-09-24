UPDATE
  crm_tasks_assignees
SET
  deleted_at = now(),
  deleted_by = $2::uuid
WHERE
  "user" = ANY($1)
  AND deleted_at IS NULL
