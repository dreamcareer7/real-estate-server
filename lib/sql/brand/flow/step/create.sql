INSERT INTO
  brands_flow_steps (
    created_by,
    created_within,
    updated_within,
    title,
    description,
    event_type,
    wait_for,
    wait_for_unit,
    "time",
    "order",
    flow,
    event,
    email,
    template,
    template_instance,
    is_automated
  )
SELECT
  $1::uuid,
  $3::text,
  $3::text,
  title,
  description,
  event_type,
  wait_for,
  wait_for_unit,
  "time",
  "order",
  flow,
  event_id,
  email,
  template,
  template_instance,
  email IS NOT NULL AS is_automated
FROM
  json_to_recordset($2) AS bs (
    title text,
    description text,
    event_type text,
    wait_for interval,
    wait_for_unit interval_unit,
    "time" time,
    "order" smallint,
    flow uuid,
    event_id uuid,
    email uuid,
    template uuid,
    template_instance uuid
  )
RETURNING
  id
