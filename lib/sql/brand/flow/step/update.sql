UPDATE
  brands_flow_steps
SET
  title = $4::text,
  description = $5::text,
  "order" = $6::smallint,
  event_type = $7::text,
  wait_for = $8::interval,
  wait_for_unit = $14::interval_unit,
  "time" = $9::interval,
  email = $10::uuid,
  template = $11::uuid,
  template_instance = $12::uuid,
  is_automated = $13::boolean,
  updated_at = now(),
  updated_by = $1,
  updated_within = $2::text
WHERE
  id = $3::uuid
