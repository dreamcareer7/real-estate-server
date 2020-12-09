UPDATE triggers
SET
  updated_within = $2,
  "user" = $3::uuid,
  event_type = $4,
  wait_for = $5,
  "time" = $6,
  recurring = $7,
  brand_event = $8,
  campaign = $9
WHERE
  id = $1::uuid
  AND executed_at IS NULL
