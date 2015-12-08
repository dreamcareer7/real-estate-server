SELECT *
FROM users
WHERE LOWER(phone_number) = LOWER($1)
