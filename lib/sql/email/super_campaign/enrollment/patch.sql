-- $1: brand (ID)
-- $2: super_campaign (ID)
-- $3: user (ID)
-- $4: [tags]
-- $5: [notifications_enabled]

UPDATE super_campaigns_enrollments AS sce SET
  tags = coalesce($4::text[], sce.tags),
  notifications_enabled = coalesce($5::boolean, sce.notifications_enabled)
WHERE
  deleted_at IS NULL AND
  brand = $1::uuid AND
  super_campaign = $2::uuid AND
  "user" = $3::uuid
