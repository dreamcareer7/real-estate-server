SELECT *,
       'stripe_customer' AS type,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at
FROM stripe_customers
WHERE id = $1
LIMIT 1;
