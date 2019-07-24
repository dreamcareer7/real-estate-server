UPDATE
  brands_flow_steps
SET
  title = $4::text,
  description = $5::text,
  due_in = $6::interval,
  email = $7::uuid,
  is_automated = $8::boolean,
  updated_at = now(),
  updated_by = $1,
  updated_within = $2::text
WHERE
  id = $3::uuid
