SELECT 'docusign_account' AS type,
  EXTRACT(EPOCH FROM created_at)   AS created_at,
  EXTRACT(EPOCH FROM updated_at)   AS updated_at,
  id,
  first_name,
  last_name,
  email
FROM docusign_users
JOIN unnest($1::uuid[]) WITH ORDINALITY t(uid, ord) ON docusign_users.id = uid
ORDER BY t.ord
