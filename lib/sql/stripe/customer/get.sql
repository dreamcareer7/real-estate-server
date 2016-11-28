SELECT
*, 'stripe_customer' AS type
FROM stripe_customers WHERE id = $1