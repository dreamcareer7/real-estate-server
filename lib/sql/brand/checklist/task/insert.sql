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
  COALESCE($6, FALSE)
)
