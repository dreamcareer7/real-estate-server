INSERT INTO godaddy_domains
(name, owner, order_id, hosted_zone) VALUES ($1, $2, $3, $4)
RETURNING id