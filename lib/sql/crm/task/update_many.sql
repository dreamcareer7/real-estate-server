UPDATE
  crm_tasks AS t
SET
  title = u.title,
  description = u.description,
  status = u.status,
  due_date = u.due_date,
  end_date = u.end_date,
  task_type = u.task_type,
  metadata = u.metadata,
  updated_at = now(),
  updated_by = $1::uuid
FROM
  json_to_recordset($2::json) u(
    id uuid,
    title text,
    description text,
    status text,
    due_date timestamptz,
    end_date timestamptz,
    task_type text,
    metadata json
  )
WHERE
  t.id = u.id
