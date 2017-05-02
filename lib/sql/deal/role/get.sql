SELECT *,
       'deal_role' AS type,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at
FROM deals_roles
JOIN unnest($1::uuid[]) WITH ORDINALITY t(rid, ord) ON deals_roles.id = rid
ORDER BY t.ord
