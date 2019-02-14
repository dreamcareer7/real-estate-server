SELECT "user" FROM brands_users WHERE role = $1
AND deleted_at IS NULL
