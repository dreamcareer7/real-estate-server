WITH tasks AS (
  SELECT
  tasks.*,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
  'task' as type,
  (
    SELECT deal FROM deals_checklists WHERE id = tasks.checklist
  ) as deal,

  (
    attention_requested_at IS NOT NULL
  ) as attention_requested

  FROM tasks
  WHERE id = ANY($1::uuid[])
  ORDER BY id DESC
)
SELECT tasks.* FROM tasks
JOIN unnest($1::uuid[]) WITH ORDINALITY t(tid, ord) ON tasks.id = tid
ORDER BY t.ord
