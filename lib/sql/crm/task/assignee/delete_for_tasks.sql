UPDATE
  crm_tasks_assignees
SET
  deleted_at = now(),
  deleted_by = $2::uuid
WHERE
  crm_task = ANY($1::uuid[])
  AND deleted_at IS NULL
