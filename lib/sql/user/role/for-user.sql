SELECT
  ($1 || '_' || brand) as id,
  brand,
  ARRAY_AGG(access) AS acl,
  'user_role' as type
  FROM (
    SELECT
      DISTINCT UNNEST(brands_roles.acl) as access,
      brands_roles.brand
    FROM users
    JOIN brands_users ON users.id = brands_users.user
    JOIN brands_roles ON brands_users.role = brands_roles.id
    JOIN brands ON brands_roles.brand = brands.id
    WHERE
      users.id = $1
      AND brands_roles.deleted_at IS NULL
      AND brands.deleted_at IS NULL
  ) roles GROUP BY brand
