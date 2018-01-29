SELECT deals_roles.*,
       'deal_role' AS type,
       EXTRACT(EPOCH FROM deals_roles.created_at) AS created_at,
       EXTRACT(EPOCH FROM deals_roles.updated_at) AS updated_at,

       ARRAY_TO_STRING(
        ARRAY[
          deals_roles.legal_prefix,
          deals_roles.legal_first_name,
          deals_roles.legal_middle_name,
          deals_roles.legal_last_name
        ], ' ', NULL
      ) as legal_full_name,

       bw.agent_id as agent_brokerwolf_id,
       (
        SELECT brokerwolf_id FROM brokerwolf_contact_types
        WHERE role = deals_roles.role
       ) as brokerwolf_contact_type
FROM deals_roles
LEFT JOIN users  ON deals_roles.user = users.id
LEFT JOIN agents ON users.agent = agents.id
LEFT JOIN brokerwolf_agents_boards bw ON agents.mlsid = bw.mls_id
JOIN unnest($1::uuid[]) WITH ORDINALITY t(rid, ord) ON deals_roles.id = rid
ORDER BY t.ord
