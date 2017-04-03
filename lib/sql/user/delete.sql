UPDATE users
SET deleted_at = CLOCK_TIMESTAMP()
WHERE id = $1
