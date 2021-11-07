DELETE FROM
  super_campaigns_enrollments
WHERE
  COALESCE(brand = $1::uuid, TRUE) AND
  COALESCE("user" = $2::uuid, TRUE) AND
  COALESCE(super_campaign = $3::uuid, TRUE) AND
  COALESCE(detached = $4::boolean, TRUE)  
