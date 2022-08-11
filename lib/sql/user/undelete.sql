UPDATE users
SET deleted_at = NULL
WHERE id = $1
