INSERT INTO
  brands_flow_steps (
    created_by,
    title,
    description,
    due_in,
    flow,
    event,
    email,
    is_automated
  )
SELECT
  $1::uuid,
  title,
  description,
  due_in,
  flow,
  event_id,
  email,
  is_automated
FROM
  json_to_recordset($2) AS bs (
    title text,
    description text,
    due_in interval,
    flow uuid,
    event_id uuid,
    email uuid,
    is_automated boolean
  )
RETURNING
  id
