UPDATE triggers
SET
  updated_within = $2,
  "user" = $3::uuid,
  event_type = $4,
  wait_for = $5,
  recurring = $6,
  brand_event = $7,
  campaign = $8
WHERE
  id = $1::uuid
  AND executed_at IS NULL
