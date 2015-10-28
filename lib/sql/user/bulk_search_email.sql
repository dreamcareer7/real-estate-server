SELECT id
FROM users
WHERE
    lower(email) = ANY($1) AND
    deleted_at IS NULL
