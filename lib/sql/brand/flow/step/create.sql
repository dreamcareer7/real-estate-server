INSERT INTO
  brands_flow_steps (
    created_by,
    title,
    description,
    due_in,
    flow,
    event
  )
SELECT
  $1::uuid,
  title,
  description,
  task_type,
  flow,
  event_id
FROM
  json_to_recordset($3) AS bs (
    title text,
    description text,
    task_type text,
    flow uuid,
    event_id uuid
  )
RETURNING
  id
