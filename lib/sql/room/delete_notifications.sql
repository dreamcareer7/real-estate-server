UPDATE notifications
SET deleted_at = NOW()
WHERE room = $1
