UPDATE
  brands_flow_steps
SET
  title = $4::text,
  description = $5::text,
  "order" = $6::smallint,
  wait_for = $7::interval,
  email = $8::uuid,
  template = $9::uuid,
  template_instance = $10::uuid,
  is_automated = $11::boolean,
  updated_at = now(),
  updated_by = $1,
  updated_within = $2::text
WHERE
  id = $3::uuid
