SELECT
  t.id
FROM
  crm_tasks AS t
  LEFT JOIN calendar_integration AS ci
    ON ci.crm_task = t.id
WHERE
  t.task_type != 'Note'
  AND t.deleted_at IS NULL
  AND (ci.id IS NULL OR ci.deleted_at IS NOT NUll)
  AND t.id = ANY($1::uuid[])
