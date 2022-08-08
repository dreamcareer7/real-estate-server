INSERT INTO brands_checklists_tasks (
  title,
  task_type,
  form,
  "order",
  checklist,
  required
) VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  COALESCE($6, FALSE),
  $7,
  COALESCE($8, ARRAY['BackOffice', 'Agents']::task_acl[])
)
