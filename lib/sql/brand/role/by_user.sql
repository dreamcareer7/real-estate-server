SELECT brands_roles.id as id FROM brands_users
JOIN brands_roles ON brands_users.role = brands_roles.id
WHERE
brands_roles.brand = $1 AND brands_users.user = $2
AND brands_users.deleted_at IS NULL
