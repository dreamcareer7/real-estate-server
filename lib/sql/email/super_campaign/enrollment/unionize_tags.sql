-- $1: tags
-- $2: [detached]
-- $3: [super_campaign (ID)]
-- $4: [brand (ID)]
-- $5: [user (ID)]

UPDATE
  super_campaigns_enrollments
SET
  updated_at = now(),
  tags = (
    SELECT array_agg(t ORDER BY t) FROM (
      SELECT DISTINCT UNNEST(tags::text[] || $1::text[]) AS t
    ) AS tmp
  )
WHERE
  deleted_at IS NULL AND
  COALESCE(detached = $2::boolean, TRUE) AND
  COALESCE(super_campaign = $3::uuid, TRUE) AND
  COALESCE(brand = $4::uuid, TRUE) AND
  COALESCE("user" = $5::uuid, TRUE)
