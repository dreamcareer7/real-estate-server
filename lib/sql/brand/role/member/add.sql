INSERT INTO brands_users (role, "user") VALUES ($1, $2)
-- TODO ON CONFLICT UPDATE
RETURNING id
