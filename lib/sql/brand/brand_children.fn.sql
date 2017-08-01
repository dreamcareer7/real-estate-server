CREATE OR REPLACE FUNCTION brand_children(id uuid) RETURNS
   setof uuid
AS
$$
  WITH RECURSIVE children AS (
    SELECT id as brand FROM brands WHERE parent = $1
    UNION
    SELECT id as brand FROM brands JOIN children ON (brands.parent = children.brand)
  )

  SELECT $1 AS brand UNION SELECT brand FROM children
$$
LANGUAGE sql;