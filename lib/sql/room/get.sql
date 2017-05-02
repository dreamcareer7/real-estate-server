SELECT 'room' AS TYPE,
       rooms.*,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM COALESCE((SELECT created_at FROM messages WHERE room = rooms.id ORDER BY created_at DESC LIMIT 1), updated_at)) AS updated_at,
       EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
       CASE WHEN $2::uuid IS NULL THEN 0
       ELSE
       (
         SELECT COUNT(*)::INT FROM notifications_users
         WHERE notification IN (SELECT id FROM notifications WHERE room = rooms.id AND COALESCE(exclude <> $2::uuid, TRUE)) AND "user" = $2::uuid AND acked_at IS NULL
       ) END AS new_notifications,
       (
         SELECT id FROM messages WHERE room = rooms.id ORDER BY created_at DESC LIMIT 1
       ) AS latest_message,
       (
         SELECT json_object_agg
         (
           "user", CASE WHEN push_enabled IS TRUE THEN
                     '{"system_generated": true}'::json ELSE
                     '{"system_generated": false}'::json
                  END
         )
         FROM rooms_users WHERE room = rooms.id
       ) AS notification_settings
FROM rooms
JOIN unnest($1::uuid[]) WITH ORDINALITY t(rid, ord) ON rooms.id = rid
ORDER BY t.ord
