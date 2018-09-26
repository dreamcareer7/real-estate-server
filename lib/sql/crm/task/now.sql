SELECT
  id
FROM
  crm_tasks
WHERE
  needs_notification IS True
  AND deleted_at IS NULL
  AND due_date <  (now() + interval '20 seconds')
  AND due_date >= (now() - interval '6 hours')
  AND due_date >= updated_at
