INSERT INTO deals_roles
(created_by, role, deal, "user") VALUES ($1, $2, $3, $4)
ON CONFLICT DO NOTHING