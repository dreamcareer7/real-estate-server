DELETE
FROM tokens
WHERE user_id = $1
  AND client_id = $2
