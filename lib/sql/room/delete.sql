UPDATE rooms
SET deleted_at = CLOCK_TIMESTAMP()
WHERE id = $1
