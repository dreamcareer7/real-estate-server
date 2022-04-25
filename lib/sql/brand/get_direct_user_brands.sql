SELECT DISTINCT brands_roles.brand as brand FROM brands_users
JOIN brands_roles ON brands_users.role = brands_roles.id
JOIN brands ON brands_roles.brand = brands.id
WHERE brands_users.user = $1
AND brands_users.deleted_at IS NULL
AND brands.deleted_at IS NULL
AND (
    CASE
    WHEN $2::text[] IS NULL THEN TRUE
    ELSE brands_roles.acl && $2
    END
)
