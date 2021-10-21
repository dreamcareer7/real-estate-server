SELECT
  id
FROM
  super_campaigns_enrollments
WHERE
  super_campaign = $1::uuid
  AND deleted_at IS NULL
ORDER BY
  created_at,
  updated_at
