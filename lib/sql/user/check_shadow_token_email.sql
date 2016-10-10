SELECT id
FROM users
WHERE email = $1 AND
      secondary_password = $2
LIMIT 1
