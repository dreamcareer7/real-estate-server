SELECT id
FROM agents
WHERE email = $1
LIMIT 1
