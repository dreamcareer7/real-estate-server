SELECT
  id
FROM
  crm_tasks
WHERE
  "notification" IS NULL
  AND deleted_at IS NULL
  AND due_date <  (now() + interval '20 seconds')
  AND due_date >= (now() - interval '6 hours')