SELECT role FROM brands_users
JOIN brands_roles ON brands_users.role = brands_roles.id
WHERE
brands_roles.brand = $1 AND brands_users.user = $2