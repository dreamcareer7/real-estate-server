SELECT
  DISTINCT brands_roles.brand AS id
FROM
  brands_users
  JOIN brands_roles
    ON brands_users.role = brands_roles.id
WHERE
  brands_users.user = $1
  AND brands_users.deleted_at IS NULL
