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
  due_in,
  flow,
  event_id
FROM
  json_to_recordset($2) AS bs (
    title text,
    description text,
    due_in interval,
    flow uuid,
    event_id uuid
  )
RETURNING
  id
