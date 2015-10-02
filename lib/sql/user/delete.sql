UPDATE users
SET deleted_at = NOW()
WHERE id = $1
