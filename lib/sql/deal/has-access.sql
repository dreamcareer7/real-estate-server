WITH user_brands AS (
  SELECT brand FROM user_brands($2::uuid, NULL)
)

SELECT
  count(*) > 0 AS has_access
FROM deals
LEFT JOIN deals_roles ON deals.id = deals_roles.deal
WHERE
      deals.id = $1
  AND deals.brand       IN (SELECT brand FROM user_brands)
  OR  deals_roles.brand IN (SELECT brand FROM user_brands)
