SELECT
    count(*) > 0 AS is
  FROM
    brands_roles
  JOIN
    brands_users ON brands_users.role = brands_roles.id
  WHERE
    brands_users.deleted_at IS NULL
    AND brand IN(SELECT * FROM brand_children($1))
    AND brands_users.user = $2
