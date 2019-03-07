INSERT INTO
  brands_events (
    created_by,
    brand,
    title,
    description,
    task_type,
    reminder
  )
SELECT
  $1::uuid,
  $2::uuid,
  title,
  description,
  task_type,
  (reminder || ' seconds')::interval
FROM
  json_to_recordset($3) AS be(
    title text,
    description text,
    task_type text,
    reminder int
  )
RETURNING
  id
