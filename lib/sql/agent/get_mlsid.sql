SELECT id
FROM agents
WHERE 
regexp_replace(upper(mlsid), '^0*', '', 'g') = regexp_replace(upper($1), '^0*', '', 'g')
OR
regexp_replace(upper(license_number), '^0*', '', 'g') = regexp_replace(upper($1), '^0*', '', 'g')