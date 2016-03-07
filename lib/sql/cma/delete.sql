UPDATE cmas
SET deleted_at = NOW()
WHERE id = $1
