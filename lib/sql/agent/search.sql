SELECT *,
       'agent' AS type
FROM agents
WHERE regexp_replace(mlsid, '^0*', '', 'g') = $1
LIMIT 1
