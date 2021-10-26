UPDATE
  super_campaigns_enrollments
SET
  tags = $1::text[]
WHERE
  deleted_at IS NULL AND
  detached = FALSE AND
  super_campaign = $2::uuid AND
  (CASE
    WHEN $3::text[] IS NULL THEN TRUE
    ELSE tags <@ $3::text[] AND tags @> $3::text[]
  END)

