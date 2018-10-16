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
  (CASE
    WHEN $5::timestamptz <> due_date THEN
      $5::timestamptz > now()
    ELSE
      needs_notification
  END) AND $6 <> 'DONE'
)
RETURNING id
