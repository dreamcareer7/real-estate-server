INSERT INTO godaddy_domains
(name, owner, order_id) VALUES ($1, $2, $3)
RETURNING id