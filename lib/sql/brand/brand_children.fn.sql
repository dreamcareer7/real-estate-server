CREATE OR REPLACE FUNCTION brand_children(id uuid) RETURNS
   setof uuid
AS
$$
  WITH RECURSIVE get_brand_children AS (
    SELECT brand, parent FROM brands_parents WHERE parent = $1
    UNION
    SELECT a.brand, a.parent FROM brands_parents a JOIN get_brand_children b ON (a.parent = b.brand)
  )

  SELECT $1 AS brand UNION SELECT brand FROM get_brand_children
$$
LANGUAGE sql;