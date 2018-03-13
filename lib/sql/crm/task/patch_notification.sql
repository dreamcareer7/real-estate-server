UPDATE
  crm_tasks
SET
  notification = $2
WHERE
  id = $1
  AND deleted_at IS NULL