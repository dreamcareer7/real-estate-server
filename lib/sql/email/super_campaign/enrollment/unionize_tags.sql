-- $1: tags
-- $2: [cause]
-- $3: [super_campaign (ID)]
-- $4: [brand (ID)]
-- $5: [user (ID)]

UPDATE
  super_campaigns_enrollments
SET
  updated_at = now(),
  tags = (
    SELECT array_agg(t1)
      FROM unnest(tags::text[]) AS t1
      LEFT JOIN unnest($1::text[]) AS t2 ON lower(t1) = lower(t2)
      WHERE t2 IS NULL
  ) || $1::text[]
WHERE
  deleted_at IS NULL AND
  (CASE
    WHEN $2 = 'automatic' THEN created_by IS NULL
    WHEN $2 = 'self' THEN created_by = "user"
    WHEN $2 = 'admin' THEN created_by <> "user"
    WHEN $2 = 'manual' THEN created_by IS NOT NULL
    ELSE TRUE
  END) AND
  COALESCE(super_campaign = $3::uuid, TRUE) AND
  COALESCE(brand = $4::uuid, TRUE) AND
  COALESCE("user" = $5::uuid, TRUE)
