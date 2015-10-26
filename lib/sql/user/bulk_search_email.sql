SELECT id
FROM users
WHERE
    lower(email) = ANY($1)
