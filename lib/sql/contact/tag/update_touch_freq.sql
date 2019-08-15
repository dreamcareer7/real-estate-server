UPDATE
  crm_tags
SET
  touch_freq = $3::int,
  updated_at = NOW(),
  updated_by = $4::uuid,
  updated_within = $5
WHERE
  tag = $2
  AND brand = $1::uuid
