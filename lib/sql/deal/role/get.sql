SELECT deals_roles.*,
       'deal_role' AS type,
       EXTRACT(EPOCH FROM deals_roles.created_at) AS created_at,
       EXTRACT(EPOCH FROM deals_roles.updated_at) AS updated_at,
       bw.agent_id as agent_brokerwolf_id
FROM deals_roles
JOIN users ON deals_roles.user = users.id
LEFT JOIN agents ON users.agent = agents.id
LEFT JOIN brokerwolf_agents_boards bw ON agents.mlsid = bw.mls_id
JOIN unnest($1::uuid[]) WITH ORDINALITY t(rid, ord) ON deals_roles.id = rid
ORDER BY t.ord
