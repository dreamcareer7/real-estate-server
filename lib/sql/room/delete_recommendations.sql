UPDATE recommendations
SET deleted_at = NOW()
WHERE room = $1
