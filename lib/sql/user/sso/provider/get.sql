SELECT 'sso_provider' AS type,
  sso_providers.*,
  EXTRACT(EPOCH FROM created_at)   AS created_at,
  EXTRACT(EPOCH FROM updated_at)   AS updated_at,
  EXTRACT(EPOCH FROM deleted_at)   AS deleted_at
FROM sso_providers
JOIN unnest($1::uuid[]) WITH ORDINALITY t(sid, ord) ON sso_providers.id = sid
ORDER BY t.ord
