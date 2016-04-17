SELECT id
FROM users
WHERE email = $1 AND
      secondary_password = $2 AND
      is_shadow IS TRUE
LIMIT 1
