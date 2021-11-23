WITH r AS (
  SELECT
    ($1 || '_' || brand) as id,
    brand,
    (
      SELECT bs.id
      FROM brands_subscriptions bs
      WHERE bs.brand IN (
        SELECT * FROM brand_parents(brand)
      )
      AND bs.status IN('active', 'in_trial')
    ) as subscription,
    ARRAY_AGG(roles.acl) as acl,
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
  SELECT brand, id FROM users_settings WHERE "user" = $1::uuid
)
SELECT
  r.*,
  us.id as settings
FROM
  r
  LEFT JOIN us ON r.brand = us.brand
