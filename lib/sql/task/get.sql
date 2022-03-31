WITH acl AS (
  SELECT * FROM deals_acl($2::uuid) WHERE $2 IS NOT NULL
),

tasks AS (
  SELECT
  DISTINCT ON (tasks.id)
  tasks.*,
  EXTRACT(EPOCH FROM tasks.created_at) AS created_at,
  EXTRACT(EPOCH FROM tasks.updated_at) AS updated_at,
  EXTRACT(EPOCH FROM tasks.deleted_at) AS deleted_at,
  tasks.acl::text[] as acl,
  'task' as type,
  (
    SELECT deal FROM deals_checklists WHERE id = tasks.checklist
  ) as deal,

  (
    attention_requested_at IS NOT NULL
  ) as attention_requested

  FROM tasks

  JOIN deals_checklists ON tasks.checklist = deals_checklists.id
  LEFT JOIN acl ON deals_checklists.deal = acl.deal

  WHERE tasks.id = ANY($1::uuid[])
  AND (
    $2 IS NULL
    OR tasks.acl @> ARRAY[acl.acl]
  )
  ORDER BY tasks.id DESC
)
SELECT tasks.* FROM tasks
JOIN unnest($1::uuid[]) WITH ORDINALITY t(tid, ord) ON tasks.id = tid
ORDER BY t.ord
