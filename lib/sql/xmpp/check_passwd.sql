SELECT *
FROM tokens
WHERE user_id = $1
  AND token = $2
  AND type = 'access'
  AND expire_date > NOW()
