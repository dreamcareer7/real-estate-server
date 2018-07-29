UPDATE users
SET timezone = $2,
    updated_at = now()
WHERE id = $1
