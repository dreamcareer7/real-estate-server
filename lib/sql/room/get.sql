SELECT 'room' AS TYPE,
       rooms.*,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at,
       EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
       (SELECT id FROM messages WHERE room = $1 ORDER BY created_at DESC LIMIT 1) AS latest_message,
       (
         WITH t AS (
                     SELECT array_agg("user"::text) u,
                            array_agg(push_enabled::text) p
                     FROM rooms_users
                     WHERE room = $1
                   )
         SELECT json_object(t.u, t.p)
         FROM t
       ) AS notification_settings
FROM rooms
WHERE id = $1
LIMIT 1
