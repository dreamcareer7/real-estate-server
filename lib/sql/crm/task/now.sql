SELECT
  t.id
FROM
  crm_tasks t
  JOIN brands b
    ON t.brand = b.id
WHERE
  t.needs_notification IS True
  AND t.deleted_at IS NULL
  AND b.deleted_at IS NULL
  AND t.due_date <  (now() + interval '20 seconds')
  AND t.due_date >= (now() - interval '6 hours')
  AND t.due_date >= t.updated_at
