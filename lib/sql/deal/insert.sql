INSERT INTO deals
(created_by, listing, deal_type) VALUES ($1, $2, $3)
RETURNING id