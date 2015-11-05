SELECT id,
       (COUNT(*) OVER())::INT AS total
FROM users
WHERE
    phone_number = ANY($1) AND
    deleted_at IS NULL
