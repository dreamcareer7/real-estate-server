INSERT INTO
  flows_steps (
    flow,
    origin,
    created_by
  )
SELECT
  flow,
  origin,
  created_by
FROM
  json_to_recordset($1) AS fs(
    flow uuid,
    origin uuid,
    created_by uuid
  )
RETURNING
  id
