SELECT deals_roles.*,
       'deal_role' AS type,
       EXTRACT(EPOCH FROM deals_roles.created_at) AS created_at,
       EXTRACT(EPOCH FROM deals_roles.updated_at) AS updated_at,
       agents.mlsid as mlsid,

       (
        CASE WHEN
          -- Trick from https://stackoverflow.com/questions/23766084/best-way-to-check-for-empty-or-null-value
          (deals_roles.legal_prefix      <> '') IS NOT TRUE AND
          (deals_roles.legal_first_name  <> '') IS NOT TRUE AND
          (deals_roles.legal_middle_name <> '') IS NOT TRUE AND
          (deals_roles.legal_last_name   <> '') IS NOT TRUE
        THEN company_title
        ELSE
          ARRAY_TO_STRING(
            ARRAY[
              deals_roles.legal_prefix,
              deals_roles.legal_first_name,
              deals_roles.legal_middle_name,
              deals_roles.legal_last_name
            ], ' ', NULL
          )
        END
       ) as legal_full_name,

       bw.agent_id as agent_brokerwolf_id,
       (
        SELECT brokerwolf_id FROM brokerwolf_contact_types
        WHERE roles @> ARRAY[deals_roles.role] AND roles IS NOT NULL
       ) as brokerwolf_contact_type
FROM deals_roles
LEFT JOIN users  ON deals_roles.user = users.id
LEFT JOIN agents ON users.agent = agents.id
LEFT JOIN brokerwolf_agents_boards bw ON (
  agents.mlsid = bw.mls_id
  OR
  /*
  * In some cases, for example, the agent being a commercial one
  * they don't have NTREIS accounts.
  * We still need to make the connection.
  * We use email address.
  * So the email address needs to be added to WolfConnect
  */
  (
    users.email = bw.mls_id
    AND users.email_confirmed IS TRUE
  )
)
JOIN unnest($1::uuid[]) WITH ORDINALITY t(rid, ord) ON deals_roles.id = rid
ORDER BY t.ord
