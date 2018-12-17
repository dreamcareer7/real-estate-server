SELECT 'user' AS type,
       users.*,
       to_char(NOW() AT TIME ZONE users.timezone, 'FMHH:MI AM - FMDay Mon DD, YYYY') AS current_time,
       (((CURRENT_TIME(0) AT TIME ZONE users.timezone)::time > '08:00:00'::time) AND
       ((CURRENT_TIME(0) AT TIME ZONE users.timezone)::time < '23:59:59'::time)) AS push_allowed,
       EXTRACT(EPOCH FROM users.created_at)   AS created_at,
       EXTRACT(EPOCH FROM users.updated_at)   AS updated_at,
       EXTRACT(EPOCH FROM users.deleted_at)   AS deleted_at,
       EXTRACT(EPOCH FROM users.last_seen_at) AS last_seen_at,
       (
        SELECT client_type FROM clients WHERE id = users.last_seen_by
       ) as last_seen_type,
       COALESCE
       (
         profile_image_url,
         (
           SELECT url FROM agents_images WHERE mui =
           (
             SELECT matrix_unique_id FROM agents WHERE id = users.agent
           ) AND image_type = 'Profile' ORDER BY date DESC LIMIT 1
         )
       ) as profile_image_url,
       COALESCE
       (
         cover_image_url,
         (
           SELECT url FROM agents_images WHERE mui =
           (
             SELECT matrix_unique_id FROM agents WHERE id = users.agent
           ) AND image_type = 'Cover' ORDER BY date DESC LIMIT 1
         )
       ) as cover_image_url,
       (
        SELECT count(*) > 0 FROM docusign_users WHERE "user" = users.id
       ) as has_docusign,
       (SELECT brand FROM users_settings WHERE "user" = users.id ORDER BY updated_at DESC LIMIT 1) AS last_active_brand
FROM users
JOIN unnest($1::uuid[]) WITH ORDINALITY t(uid, ord) ON users.id = uid
ORDER BY t.ord
