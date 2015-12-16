SELECT *,
       'agent' AS type
FROM agents
WHERE id = $1
LIMIT 1
