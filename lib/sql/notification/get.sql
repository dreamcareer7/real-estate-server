SELECT
    'notification' AS type,
    *,
    notifications.subject_class::text || notifications.action::text || notifications.object_class::text AS notification_type,
    EXTRACT(EPOCH FROM created_at) AS created_at,
    EXTRACT(EPOCH FROM updated_at) AS updated_at,
    EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
    CASE WHEN $2::uuid IS NULL THEN FALSE
    ELSE (
      SELECT
      (
        NOT EXISTS(SELECT id FROM notifications_users WHERE notification = $1 AND "user" = $2::uuid) OR
        EXISTS(SELECT id FROM notifications_users WHERE notification = $1 AND "user" = $2::uuid AND seen_at IS NOT NULL)
      )
    ) END AS seen
FROM notifications
WHERE id = $1
