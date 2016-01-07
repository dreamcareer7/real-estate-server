SELECT id
FROM agents
WHERE office_mlsid = $1
ORDER BY first_name
