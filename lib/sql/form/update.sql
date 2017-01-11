UPDATE forms
SET
fields = $3,
name = $2,
updated_at = NOW()
WHERE id = $1
