SELECT id
FROM agents
WHERE regexp_replace(upper(mlsid), '^0*', '', 'g') = regexp_replace(upper($1), '^0*', '', 'g')
LIMIT 1
