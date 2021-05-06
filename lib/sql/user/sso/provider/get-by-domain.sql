SELECT id FROM sso_providers WHERE LOWER(domain) = LOWER($1) AND deleted_at IS NULL
