UPDATE tasks
SET deleted_at = NOW()
WHERE google_id = $1
