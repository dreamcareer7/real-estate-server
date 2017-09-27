INSERT INTO brands_roles (brand, role, acl) VALUES ($1, $2, $3)
RETURNING id