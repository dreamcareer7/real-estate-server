UPDATE
  super_campaigns_enrollments
SET
  deleted_at = now(),
WHERE
  deleted_at IS NULL AND
  (CASE
    WHEN $1::uuid IS NULL THEN TRUE
    ELSE brand = $1::uuid
  END) AND
  (CASE
    WHEN $2::uuid IS NULL THEN TRUE
    ELSE "user" = $2::uuid
  END) AND
  (CASE
    WHEN $3::uuid IS NULL THEN TRUE
    ELSE super_campaign = $3::uuid
  END)
  
