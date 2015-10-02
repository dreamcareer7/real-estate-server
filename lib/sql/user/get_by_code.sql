SELECT *
FROM users
WHERE user_code = $1 AND
      deleted_at IS NULL
