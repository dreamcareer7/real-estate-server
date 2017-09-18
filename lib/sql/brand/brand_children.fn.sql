CREATE OR REPLACE FUNCTION brand_children(id uuid) RETURNS
   setof uuid
AS
$$
  WITH RECURSIVE children AS (
    SELECT id as brand FROM brands WHERE parent = $1 AND deleted_at IS NULL
    UNION
    SELECT id as brand FROM brands JOIN children ON brands.parent = children.brand AND deleted_at IS NULL
  )

  SELECT $1 AS brand UNION SELECT brand FROM children
$$
LANGUAGE sql;