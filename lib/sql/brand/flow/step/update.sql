UPDATE
  brands_flow_steps
SET
  title = $4::text,
  description = $5::text,
  "order" = $6::smallint,
  wait_for = $7::interval,
  "time" = $8::interval,
  email = $9::uuid,
  template = $10::uuid,
  template_instance = $11::uuid,
  is_automated = $12::boolean,
  updated_at = now(),
  updated_by = $1,
  updated_within = $2::text
WHERE
  id = $3::uuid
