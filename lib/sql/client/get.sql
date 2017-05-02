SELECT *
FROM clients
JOIN unnest($1::uuid[]) WITH ORDINALITY t(cid, ord) ON clients.id = cid
ORDER BY t.ord
