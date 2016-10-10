SELECT id
FROM users
WHERE phone_number = $1 AND
      secondary_password = $2
LIMIT 1
