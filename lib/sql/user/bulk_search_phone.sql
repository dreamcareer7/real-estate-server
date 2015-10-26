SELECT id
FROM users
WHERE
    phone_number = ANY($1)
