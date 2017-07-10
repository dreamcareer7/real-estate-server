WITH tasks AS (
  SELECT
  tasks.*,
  'task' as type
  FROM tasks
  WHERE id = ANY($1::uuid[])
  ORDER BY id DESC
)
SELECT tasks.* FROM tasks
JOIN unnest($1::uuid[]) WITH ORDINALITY t(tid, ord) ON tasks.id = tid
ORDER BY t.ord
