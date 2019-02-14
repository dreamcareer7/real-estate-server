INSERT INTO brands_users (role, "user") VALUES ($1, $2)
ON CONFLICT (role, "user")
DO UPDATE SET
  deleted_at = NULL
RETURNING id
