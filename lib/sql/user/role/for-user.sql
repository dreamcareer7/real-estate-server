WITH r AS (
  SELECT
    ($1 || '_' || brand) as id,
    brand,

    ARRAY_REMOVE(ARRAY_AGG(
      (
        SELECT roles.acl
        INTERSECT
        (
          SELECT UNNEST(billing_plans.acl)
          FROM brands_subscriptions bs
          JOIN billing_plans ON bs.plan = billing_plans.id
          WHERE bs.user = $1
          AND   bs.brand IN (
            SELECT * FROM brand_parents(brand)
          )
        )
      )
    ), NULL) as acl,
    'user_role' as type
    FROM (
        SELECT DISTINCT UNNEST(brands_roles.acl) as acl,
        brands_roles.brand
      FROM users
      JOIN brands_users ON users.id = brands_users.user
      JOIN brands_roles ON brands_users.role = brands_roles.id
      JOIN brands ON brands_roles.brand = brands.id
      WHERE
        users.id = $1
        AND brands_roles.deleted_at IS NULL
        AND brands.deleted_at       IS NULL
        AND brands_users.deleted_at IS NULL
    ) roles
  GROUP BY
    brand
), us AS (
  SELECT
    brand,
    JSON_OBJECT_AGG(key, value) AS user_settings
  FROM
    users_settings
  WHERE
    "user" = $1::uuid
  GROUP BY
    brand
)
SELECT
  r.*,
  us.user_settings
FROM
  r
  LEFT JOIN us ON r.brand = us.brand
