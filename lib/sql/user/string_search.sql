SELECT id,
       (COUNT(*) OVER())::INT AS total
FROM users
WHERE
    (first_name ~* $1 OR
    last_name ~* $1) AND
    deleted_at IS NULL
