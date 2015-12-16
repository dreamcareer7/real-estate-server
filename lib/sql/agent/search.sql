SELECT *,
       'agent' AS type
FROM agents
WHERE mlsid = $1
LIMIT 1
