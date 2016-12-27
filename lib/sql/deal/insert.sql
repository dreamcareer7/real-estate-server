INSERT INTO deals
(created_by, listing, deal_type, address) VALUES ($1, $2, $3, $4)
RETURNING id