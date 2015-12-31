SELECT 'room' AS TYPE,
       rooms.*,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at,
       EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
       (SELECT id FROM messages WHERE room = $1 ORDER BY created_at DESC LIMIT 1) AS latest_message,
       (SELECT json_object_agg("user", CASE WHEN
                                        push_enabled IS TRUE THEN '{"system_generated": true}'::json
                                        ELSE '{"system_generated": false}'::json
                                       END
                              )
        FROM rooms_users WHERE room = $1
       ) AS notification_settings
FROM rooms
WHERE id = $1
LIMIT 1
