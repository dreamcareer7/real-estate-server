CREATE OR REPLACE FUNCTION brands_children(id uuid[]) RETURNS
   setof uuid
AS
$$
  WITH RECURSIVE children AS (
    SELECT id as brand FROM brands WHERE parent = ANY($1) AND deleted_at IS NULL
    UNION
    SELECT id as brand FROM brands JOIN children ON brands.parent = children.brand AND deleted_at IS NULL
  )

  SELECT UNNEST($1) AS brand UNION SELECT brand FROM children
$$
STABLE
PARALLEL SAFE
LANGUAGE sql;
