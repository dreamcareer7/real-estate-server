UPDATE
  super_campaigns_enrollments
SET
  deleted_at = now()
WHERE
  deleted_at IS NULL AND
  COALESCE(brand = $1::uuid, TRUE) AND
  COALESCE("user" = $2::uuid, TRUE) AND
  COALESCE(super_campaign = $3::uuid, TRUE) AND
  (CASE
    WHEN $4 = 'automatic' THEN created_by IS NULL
    WHEN $4 = 'self' THEN created_by = "user"
    WHEN $4 = 'admin' THEN created_by <> "user"
    ELsE TRUE
  END)

