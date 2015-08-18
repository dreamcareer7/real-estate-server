UPDATE users
SET timezone = $2,
    updated_at = NOW()
WHERE id = $1
