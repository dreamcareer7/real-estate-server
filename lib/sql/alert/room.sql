SELECT id
FROM alerts
WHERE room = $1 AND
deleted_at IS NULL
ORDER BY created_at DESC
