SELECT 'user' AS type,
       users.*,
       NOW() AT TIME ZONE users.timezone AS current_time,
       (((CURRENT_TIME(0) AT TIME ZONE users.timezone)::time > '08:00:00'::time) AND
       ((CURRENT_TIME(0) AT TIME ZONE users.timezone)::time < '23:59:59'::time)) AS push_allowed,
       EXTRACT(EPOCH FROM users.created_at) AS created_at,
       EXTRACT(EPOCH FROM users.updated_at) AS updated_at
FROM users
WHERE users.id = $1
