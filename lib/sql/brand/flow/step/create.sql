INSERT INTO
  brands_flow_steps (
    created_by,
    created_within,
    updated_within,
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
  $3::text,
  $3::text,
  title,
  description,
  due_in,
  flow,
  event_id,
  email,
  email IS NOT NULL AS is_automated
FROM
  json_to_recordset($2) AS bs (
    title text,
    description text,
    due_in interval,
    flow uuid,
    event_id uuid,
    email uuid
  )
RETURNING
  id
