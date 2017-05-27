CREATE OR REPLACE FUNCTION get_brand_users(id uuid) RETURNS
   setof uuid
AS
$$
  SELECT "user" FROM brands_users WHERE brand = $1
  UNION
  SELECT id FROM users WHERE agent IN (
    SELECT id FROM agents
    WHERE office_mui IN (
      SELECT matrix_unique_id FROM offices
      WHERE id IN (SELECT office FROM brands_offices WHERE brand = $1)
    )
  )
$$
LANGUAGE sql;