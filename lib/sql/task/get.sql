WITH tasks AS (
  SELECT
  tasks.*,
  'task' as type,
  (
    SELECT deal FROM deals_checklists WHERE id = tasks.checklist
  ) as deal,

  (
    SELECT formstack_id FROM forms WHERE id = tasks.form
  ) as formstack_id, -- Fuck my life.

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
