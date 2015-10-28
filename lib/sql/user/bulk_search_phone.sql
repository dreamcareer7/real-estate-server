SELECT id
FROM users
WHERE
    phone_number = ANY($1) AND
    deleted_at IS NULL
