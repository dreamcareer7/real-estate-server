UPDATE forms
SET
fields = $3,
name = $2,
updated_at = CLOCK_TIMESTAMP()
WHERE id = $1
