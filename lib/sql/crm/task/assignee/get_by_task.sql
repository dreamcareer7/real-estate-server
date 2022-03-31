SELECT
  id, "user"
FROM
  crm_tasks_assignees
WHERE
  crm_task = $1::uuid
  AND deleted_at IS NULL
