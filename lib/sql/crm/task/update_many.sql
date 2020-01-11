UPDATE
  crm_tasks AS t
SET
  t.title = u.title,
  t.description = u.description,
  t.status = u.status,
  t.due_date = u.due_date,
  t.end_date = u.end_date,
  t.task_type = u.task_type,
  t.metadata = u.metadata,
  t.updated_at = now(),
  t.updated_by = $1::uuid
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
