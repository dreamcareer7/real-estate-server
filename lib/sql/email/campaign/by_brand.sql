-- $1: brand (uuid)
-- $2: havingDueAt (boolean | NULL)
-- $3: havingExecutedAt (boolean | NULL)
-- $4: limit (integer | NULL)
-- $5: start (integer | NULL)

SELECT
  id,
  COUNT(*) OVER()::INT AS total
FROM email_campaigns
WHERE
  brand = $1::uuid
  AND deleted_at IS NULL
  AND (CASE WHEN $2::boolean IS NULL THEN TRUE
            WHEN $2::boolean THEN due_at IS NOT NULL
            WHEN NOT $2::boolean THEN due_at IS NULL END)
  AND (CASE WHEN $3::boolean IS NULL THEN TRUE
            WHEN $3::boolean THEN executed_at IS NOT NULL
            WHEN NOT $3::boolean THEN executed_at IS NULL END)
ORDER BY created_at DESC
LIMIT $4::integer
OFFSET $5::integer
