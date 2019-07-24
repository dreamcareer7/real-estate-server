INSERT INTO
  brands_events (
    created_by,
    brand,
    title,
    description,
    task_type,
    reminder,
    created_within,
    updated_within
  )
SELECT
  $1::uuid,
  $2::uuid,
  title,
  description,
  task_type,
  (reminder || ' seconds')::interval,
  $4::text,
  $4::text
FROM
  json_to_recordset($3) AS be(
    title text,
    description text,
    task_type text,
    reminder int
  )
RETURNING
  id
