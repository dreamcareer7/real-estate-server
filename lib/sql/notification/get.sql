SELECT
    'notification' AS type,
    *,
    action AS notification_type,
    EXTRACT(EPOCH FROM created_at) AS created_at,
    EXTRACT(EPOCH FROM updated_at) AS updated_at,
    EXTRACT(EPOCH FROM deleted_at) AS deleted_at
FROM notifications
WHERE id = $1
