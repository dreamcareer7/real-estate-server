UPDATE
  crm_tasks
SET
  title=$2,
  description=$3,
  due_date=$4,
  end_date=$5,
  status=$6,
  task_type=$7,
  metadata=$8::json,
  searchable_field=COALESCE($2, '') || ' ' || COALESCE($3, ''),
  updated_at=now(),
  updated_by = $9::uuid,
  needs_notification = (CASE
    WHEN $4::timestamptz <> due_date THEN
      $4::timestamptz > now()
    ELSE
      needs_notification
    END) AND $6 <> 'DONE'
WHERE
  id = $1
  AND deleted_at IS NULL
