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
  (CASE
    WHEN $2::boolean IS NULL THEN TRUE
    ELSE detached = $2::boolean
  END) AND
  (CASE
    WHEN $3::uuid IS NULL THEN TRUE
    ELSE super_campaign = $3::uuid
  END) AND
  (CASE
    WHEN $4::uuid IS NULL THEN TRUE
    ELSE brand = $4::uuid
  END) AND
  (CASE
    WHEN $5::uuid IS NULL THEN TRUE
    ELSE "user" = $5::uuid
  END)
