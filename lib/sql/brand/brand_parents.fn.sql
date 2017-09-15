CREATE OR REPLACE FUNCTION brand_parents(id uuid) RETURNS
   setof uuid
AS
$$
  WITH RECURSIVE parents AS (
    SELECT parent as brand FROM brands WHERE id = $1
    UNION
    SELECT parent as brand FROM brands JOIN parents ON (brands.id = parents.brand)
  )

  SELECT $1 AS brand UNION SELECT brand FROM parents WHERE brand IS NOT NULL
$$
LANGUAGE sql;