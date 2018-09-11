SELECT
  id
FROM
  crm_tasks_assignees
WHERE
  task = $1::uuid
  AND deleted_at IS NULL
