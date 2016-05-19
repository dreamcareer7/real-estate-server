UPDATE rooms
SET deleted_at = NULL
WHERE id = $1
