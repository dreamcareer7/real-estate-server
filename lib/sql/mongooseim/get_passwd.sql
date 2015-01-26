SELECT token
FROM tokens
WHERE user_id = $1
ORDER BY expire_date DESC
LIMIT 1
