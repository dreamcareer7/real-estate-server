WITH bp AS (
  SELECT
    id
  FROM
    brand_parents($2) t(id)
)
SELECT
  id,
  ((brand IS NULL) OR (brand IN (SELECT id FROM bp))) AS "read",
  (brand = $2) AS "write"
FROM
  brands_flows
JOIN
  unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON brands_flows.id = did
WHERE
  deleted_at IS NULL
