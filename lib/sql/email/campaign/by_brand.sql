WITH
all_campaigns AS (
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
executed_campaigns AS (
  SELECT
    id,
    created_at
  FROM all_campaigns
  WHERE executed_at IS NOT NULL
  LIMIT floor($3::real / 2)
)
scheduled_campaigns AS (
  SELECT
    id,
    created_at
  FROM all_campaigns
  WHERE executed_at IS NULL
  LIMIT ceil($3::real / 2)
)
SELECT
  mix.id
FROM (SELECT * FROM executed_campaigns
      UNION ALL
      SELECT * FROM scheduled_campaigns) AS mix
ORDER BY mix.created_at DESC
