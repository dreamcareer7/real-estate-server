INSERT INTO godaddy_domains
(name, owner) VALUES ($1, $2)
RETURNING id
