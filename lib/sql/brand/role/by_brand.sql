SELECT
  id
FROM
  brands_roles
WHERE brand = $1 AND deleted_at IS NULL