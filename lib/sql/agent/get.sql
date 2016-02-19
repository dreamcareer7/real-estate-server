SELECT *,
       'agent' AS type,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at,
       EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
       (SELECT id FROM users where agent = $1 LIMIT 1) AS user_id
FROM agents
WHERE id = $1
LIMIT 1
