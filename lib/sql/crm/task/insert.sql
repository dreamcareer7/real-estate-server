INSERT INTO crm_tasks (
  created_by,
  brand,
  title,
  description,
  due_date,
  status,
  task_type,
  metadata,
  searchable_field,
  needs_notification
)
VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7,
  $8,
  COALESCE($3, '') || ' ' || COALESCE($4, ''),
  ($5::timestamptz > now() AND $6 <> 'DONE')
)
RETURNING id
