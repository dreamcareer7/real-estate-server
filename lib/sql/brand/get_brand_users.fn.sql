CREATE OR REPLACE FUNCTION get_brand_users(id uuid) RETURNS
   setof uuid
AS
$$
  SELECT "user" FROM brands_users
  JOIN brands_roles ON brands_users.role = brands_roles.id
  WHERE brands_roles.brand = $1
  AND brands_users.deleted_at IS NULL
$$
LANGUAGE sql;
