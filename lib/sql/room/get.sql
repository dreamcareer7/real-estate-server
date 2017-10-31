SELECT 'room' AS TYPE,
       rooms.*,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM COALESCE((SELECT created_at FROM messages WHERE room = rooms.id ORDER BY created_at DESC LIMIT 1), updated_at)) AS updated_at,
       EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
       CASE WHEN $2::uuid IS NULL THEN 0
       ELSE
       (
         SELECT COUNT(*)::INT FROM notifications_users
         WHERE notification IN (SELECT id FROM notifications WHERE room = rooms.id AND COALESCE(NOT ($2::uuid = ANY(exclude)), TRUE)) AND "user" = $2::uuid AND acked_at IS NULL
       ) END AS new_notifications,
       (
         SELECT id FROM messages WHERE room = rooms.id ORDER BY created_at DESC LIMIT 1
       ) AS latest_message,
       (
         SELECT json_object_agg
         (
           "user", notification_setting
         )
         FROM rooms_users WHERE room = rooms.id AND "user" = $2::uuid
       ) AS notification_settings,
       (
         SELECT ARRAY_AGG(DISTINCT("user")) FROM rooms_users WHERE room = rooms.id
       ) AS users,
       (
         SELECT JSON_AGG(JSON_BUILD_OBJECT
           (
             'id', users.id,
             'first_name', users.first_name,
             'last_name', users.last_name,
             'email', users.email,
             'phone_number', users.phone_number,
             'fake_email', users.fake_email
           )
         )
         FROM rooms_users
         INNER JOIN users
           ON rooms_users."user" = users.id
         WHERE rooms_users.room = rooms.id
         GROUP BY rooms_users.room
       ) AS users_info,
       (
         SELECT ARRAY_AGG(files_relations.file)
         FROM files_relations
         JOIN files ON files_relations.file = files.id
         WHERE files_relations.role = 'Room' AND files_relations.role_id = rooms.id
         AND files.deleted_at IS NULL
         AND files_relations.deleted_at IS NULL
       ) AS attachments
FROM rooms
JOIN unnest($1::uuid[]) WITH ORDINALITY t(rid, ord) ON rooms.id = rid
ORDER BY t.ord
