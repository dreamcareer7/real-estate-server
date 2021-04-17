WITH user_brands AS MATERIALIZED (
  SELECT brand FROM user_brands($2::uuid, NULL)
)
SELECT
  count(*) > 0 AS has_access
FROM
  showings AS s
  LEFT JOIN showings_roles AS r
    ON s.id = r.showing
WHERE
  s.id = $1::uuid
  AND (
    s.brand = ANY(SELECT brand FROM user_brands)
    OR (
      r.deleted_at IS NULL
      AND r.brand = ANY(SELECT brand FROM user_brands)
    )
  )
  AND (($3::boolean IS FALSE) OR (can_approve IS TRUE))