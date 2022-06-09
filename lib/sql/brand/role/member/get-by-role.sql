SELECT
  id
FROM
  brands_users
WHERE
  role = $1
  AND "user" = $2
  AND deleted_at IS NULL
LIMIT 1
