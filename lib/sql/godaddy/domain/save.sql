INSERT INTO godaddy_domains
(name, owner, charge) VALUES ($1, $2, $3)
RETURNING id
