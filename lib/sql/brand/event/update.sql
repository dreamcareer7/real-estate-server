UPDATE
  brands_events
SET
  task_type = $4::text,
  title = $5::text,
  description = $6::text,
  updated_at = now(),
  updated_by = $1,
  updated_within = $2::text
WHERE
  id = $3::uuid
