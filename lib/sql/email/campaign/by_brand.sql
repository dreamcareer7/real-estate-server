WITH all_campaigns AS (
  SELECT
    id,
    created_at,
    executed_at
  FROM email_campaigns
  WHERE
    brand = $1::uuid
    AND deleted_at IS NULL
    AND (CASE WHEN $2::boolean IS NULL THEN TRUE
              WHEN $2::boolean THEN due_at IS NOT NULL
              WHEN NOT $2::boolean THEN due_at IS NULL END)
  ORDER BY created_at DESC
)

-- Executed campaigns
(SELECT id
 FROM all_campaigns
 WHERE executed_at IS NOT NULL
 ORDER BY created_at DESC
 LIMIT floor($3::real / 2))

UNION ALL

-- Scheduled campaigns
(SELECT id
 FROM all_campaigns
 WHERE executed_at IS NULL
 ORDER BY created_at DESC
 LIMIT ceil($3::real / 2))
