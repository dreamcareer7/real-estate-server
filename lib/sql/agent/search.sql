SELECT id
FROM agents
WHERE regexp_replace(mlsid, '^0*', '', 'g') = regexp_replace($1, '^0*', '', 'g')
LIMIT 1
