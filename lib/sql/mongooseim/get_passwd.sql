SELECT token
FROM tokens
WHERE user_id = $1
  AND type = 'access'
ORDER BY expire_date DESC
LIMIT 1
