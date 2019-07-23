UPDATE
  brands_flows
SET
  name = $4::text,
  description = $5::text,
  updated_at = now(),
  updated_by = $1,
  updated_within = $2::text
WHERE
  id = $3::uuid
