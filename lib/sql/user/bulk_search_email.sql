SELECT id,
       (COUNT(*) OVER())::INT AS total
FROM users
WHERE
    lower(email) = ANY($1) AND
    deleted_at IS NULL
ORDER BY first_name
