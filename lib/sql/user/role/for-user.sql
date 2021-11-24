WITH roles AS (
  SELECT DISTINCT
    UNNEST(brands_roles.acl) AS acl,
    brands_roles.brand
  FROM users
  JOIN brands_users ON users.id = brands_users.user
  JOIN brands_roles ON brands_users.role = brands_roles.id
  JOIN brands ON brands_roles.brand = brands.id
  WHERE
    users.id = $1::uuid
    AND brands_users.deleted_at IS NULL
    AND brands_roles.deleted_at IS NULL
    AND brands.deleted_at IS NULL
)
SELECT
  $1::uuid || '_' || r.brand AS id,
  ARRAY_AGG(r.acl) AS acl,
  r.brand,

  (
    SELECT
      bs.id
    FROM
      brands_subscriptions AS bs
    WHERE
      bs.status IN ('active', 'in_trial')
      AND bs.brand IN (SELECT * FROM brand_parents(r.brand))
  ) AS subscription,
  
  (
    SELECT
      us.id
    FROM
      users_settings AS us
    WHERE
      us.user = $1::uuid
      AND us.brand = r.brand 
  ) AS settings,
  
  'user_role' AS type
FROM
  roles AS r
GROUP BY
  r.brand
