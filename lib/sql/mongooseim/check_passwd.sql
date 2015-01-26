SELECT *
FROM tokens
WHERE user_id = $1
  AND token = $2
  AND expire_date > NOW()
