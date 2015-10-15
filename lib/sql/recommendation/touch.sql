UPDATE recommendations
SET updated_at = NOW()
WHERE id = $1
