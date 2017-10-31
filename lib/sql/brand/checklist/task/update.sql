UPDATE brands_checklists_tasks SET
  title = $2,
  task_type = $3,
  form = $4,
  "order" = $5
WHERE id = $1