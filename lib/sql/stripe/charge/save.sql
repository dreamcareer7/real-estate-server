INSERT INTO stripe_charges
("user", customer, amount, charge) VALUES ($1, $2, $3, $4)
RETURNING id