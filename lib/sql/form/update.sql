UPDATE forms
SET
name = $2,
brand = $3,
updated_at = CLOCK_TIMESTAMP()
WHERE id = $1
