SELECT
  id
FROM
  super_campaigns
WHERE
  brand = $1::uuid
ORDER BY
  created_at DESC
OFFSET $2::int
LIMIT 100
