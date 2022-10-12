INSERT INTO brands_checklists_tasks (
  title,
  task_type,
  form,
  "order",
  checklist,
  required,
  tab_name,
  acl
) VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  COALESCE($6, FALSE),
  $7,
  $8::task_acl[]
)
