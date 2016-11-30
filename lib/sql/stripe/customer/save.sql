INSERT INTO stripe_customers
(owner, customer_id, source) VALUES ($1, $2, $3)
RETURNING id