SELECT
  e.id,
  extract(epoch from created_at) as created_at,
  extract(epoch from updated_at) as updated_at,
  extract(epoch from deleted_at) as deleted_at,
  brand,
  "user",
  tags,
  created_by,
  super_campaign,
  campaign,
  notifications_enabled,

  'super_campaign_enrollment' AS type
FROM
  super_campaigns_enrollments e
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(oid, ord) ON e.id = oid
ORDER BY t.ord
