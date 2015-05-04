SELECT users.*,
       EXTRACT(EPOCH FROM users.created_at) AS created_at,
       EXTRACT(EPOCH FROM users.updated_at) AS updated_at
FROM users
WHERE users.id = $1
