SELECT id,
       'office' as type,
       name,
       mls_id
FROM offices
JOIN unnest($1::uuid[]) WITH ORDINALITY t(oid, ord) ON offices.id = oid
ORDER BY t.ord
