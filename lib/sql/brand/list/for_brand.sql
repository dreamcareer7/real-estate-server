SELECT
  id
FROM
  brands_lists
WHERE
  brand IS NULL
  OR brand IN(SELECT brand_parents($1))
