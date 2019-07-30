UPDATE brands_checklists_tasks SET
  title = $2,
  task_type = $3,
  form = $4,
  "order" = $5,
  required = COALESCE($6, FALSE)
WHERE id = $1
