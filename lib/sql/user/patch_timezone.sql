UPDATE users
SET timezone = $2,
    updated_at = CLOCK_TIMESTAMP()
WHERE id = $1
