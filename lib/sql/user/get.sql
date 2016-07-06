SELECT 'user' AS type,
       users.*, google_tokens.calendar_id,
       to_char(NOW() AT TIME ZONE users.timezone, 'FMHH:MI AM - FMDay Mon DD, YYYY') AS current_time,
       (((CURRENT_TIME(0) AT TIME ZONE users.timezone)::time > '08:00:00'::time) AND
       ((CURRENT_TIME(0) AT TIME ZONE users.timezone)::time < '23:59:59'::time)) AS push_allowed,
       EXTRACT(EPOCH FROM users.created_at) AS created_at,
       EXTRACT(EPOCH FROM users.updated_at) AS updated_at,
       EXTRACT(EPOCH FROM users.deleted_at) AS deleted_at,

       COALESCE(
        profile_image_url,
        (
          SELECT url FROM agents_images WHERE mui = (
            SELECT matrix_unique_id FROM agents WHERE id = users.id
          ) AND image_type = 'Profile' ORDER BY date DESC LIMIT 1
        )
       ) as profile_image_url

FROM users
LEFT OUTER JOIN google_tokens
ON users.id = google_tokens.user
WHERE users.id = $1 AND
      users.deleted_at IS NULL
LIMIT 1
