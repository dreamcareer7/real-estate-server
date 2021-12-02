SELECT
  bu.user,
  array_union(acl) AS acl
FROM
  brands_users AS bu
  JOIN brands_roles AS br
    ON bu.role = br.id
WHERE
  bu.deleted_at IS NULL
  AND br.deleted_at IS NULL
  AND br.brand = $1::uuid
GROUP BY
  bu.user
