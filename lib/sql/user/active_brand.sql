WITH us AS MATERIALIZED (
  SELECT
    *
  FROM
    users_settings
  WHERE
    "user" = $1::uuid
)
SELECT
  us.brand
FROM
  ((
    SELECT bc.id
    FROM unnest($2::uuid[]) AS ub(id)
    CROSS JOIN LATERAL brand_children(ub.id) AS bc(id)
  ) UNION (
    SELECT *
    FROM unnest($2::uuid[]) AS ub(id)
  )) AS b(id)
  JOIN us ON us.brand = b.id
ORDER BY
  us.updated_at DESC
LIMIT 1
