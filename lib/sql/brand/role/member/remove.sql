UPDATE brands_users SET deleted_at = NOW()
WHERE role = $1 AND "user" = $2
