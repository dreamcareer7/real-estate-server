SELECT * FROM mls_info 
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON mls_info.id = did
ORDER BY t.ord