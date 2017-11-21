INSERT INTO deals_roles
(created_by, role, deal, "user", commission) VALUES ($1, $2, $3, $4, $5)
ON CONFLICT DO NOTHING