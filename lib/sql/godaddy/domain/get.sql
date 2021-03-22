SELECT godaddy_domains.*,
       'domain' AS type,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at
FROM godaddy_domains
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON godaddy_domains.id = did
ORDER BY t.ord
