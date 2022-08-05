SELECT 'notification' AS type,
       notifications.*,
       notifications.subject_class::text || notifications.action::text || notifications.object_class::text AS notification_type,
       notifications.transports::text[],
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at,
       EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
       CASE WHEN $2::uuid IS NULL THEN FALSE
       ELSE (
         SELECT
         (
           NOT EXISTS(SELECT id FROM notifications_users WHERE notification = notifications.id AND "user" = $2::uuid) OR
           EXISTS(SELECT id FROM notifications_users WHERE notification = notifications.id AND "user" = $2::uuid AND seen_at IS NOT NULL)
         )
       ) END AS seen,

       CASE WHEN $2::uuid IS NULL THEN notifications.message
       ELSE (
         COALESCE(NULLIF(notifications.message, ''), (
          SELECT message FROM notifications_users
          WHERE notification = notifications.id AND "user" = $2
         ))
       ) END AS message

FROM notifications
JOIN unnest($1::uuid[]) WITH ORDINALITY t(nid, ord) ON notifications.id = nid
ORDER BY t.ord
