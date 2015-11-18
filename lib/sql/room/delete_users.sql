UPDATE rooms_users
SET deleted_at = NOW()
WHERE room = $1
