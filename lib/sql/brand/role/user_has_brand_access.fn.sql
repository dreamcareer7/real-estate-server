CREATE OR REPLACE FUNCTION user_has_brand_access("user" uuid, brand uuid) RETURNS boolean AS
$$
  SELECT
    count(*) > 0 AS has
  FROM
    brands_roles
  JOIN
    brands_users ON brands_users.role = brands_roles.id
  WHERE
    brands_users.user = $1
    AND brand IN(SELECT * FROM brand_parents($2))
$$
LANGUAGE sql;
