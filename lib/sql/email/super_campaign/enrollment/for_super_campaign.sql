SELECT
  id,
  (COUNT(*) OVER())::INT AS total
FROM
  super_campaigns_enrollments
WHERE
  super_campaign = $1::uuid
  AND deleted_at IS NULL
ORDER BY
  created_at DESC
OFFSET $2
LIMIT $3
