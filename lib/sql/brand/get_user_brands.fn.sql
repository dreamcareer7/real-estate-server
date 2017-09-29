CREATE OR REPLACE FUNCTION user_brands("user" uuid) RETURNS TABLE(
  brand uuid
)
AS
$$
  WITH roles AS (
    SELECT DISTINCT brands_roles.brand as brand FROM brands_users
    JOIN brands_roles ON brands_users.role = brands_roles.id
    WHERE brands_users.user = $1
  )

SELECT brand_children(roles.brand) FROM roles
$$
LANGUAGE sql;