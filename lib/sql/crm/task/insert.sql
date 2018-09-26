INSERT INTO crm_tasks (
  created_by,
  brand,
  title,
  description,
  due_date,
  status,
  task_type,
  searchable_field
)
VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7,
  COALESCE($3, '') || ' ' || COALESCE($4, '')
)
RETURNING id
