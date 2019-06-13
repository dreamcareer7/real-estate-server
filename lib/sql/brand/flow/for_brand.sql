SELECT
  id
FROM
  brands_flows
WHERE
  (
    brand IS NULL
    OR brand IN(SELECT brand_parents($1))
  )
  AND deleted_at IS NULL
ORDER BY
  "order"
