UPDATE forms
SET
fields = $2,
updated_at = NOW()
WHERE id = $1