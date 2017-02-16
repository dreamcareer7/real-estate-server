UPDATE stripe_customers SET deleted_at = CLOCK_TIMESTAMP() WHERE id = $1
