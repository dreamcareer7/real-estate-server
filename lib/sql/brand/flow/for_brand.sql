SELECT
  id
FROM
  brands_flows
WHERE
  brand = $1
  AND deleted_at IS NULL;
