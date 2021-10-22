UPDATE
  super_campaigns_enrollments
SET
  deleted_at = now(),
WHERE
  deleted_at IS NULL AND
  brand = $1::uuid AND
  "user" = $2::uuid AND
  super_campaign = $1::uuid
  
