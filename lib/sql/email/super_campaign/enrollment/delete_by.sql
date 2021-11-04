UPDATE
  super_campaigns_enrollments
SET
  deleted_at = now(),
WHERE
  deleted_at IS NULL AND
  COALESCE(brand = $1::uuid, TRUE) AND
  COALESCE("user" = $2::uuid, TRUE) AND
  COALESCE(super_campaign = $3::uuid, TRUE) AND
  COALESCE(detached = $4::boolean, TRUE)  
