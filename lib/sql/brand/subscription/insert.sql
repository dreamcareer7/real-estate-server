INSERT INTO brands_subscriptions
(created_within, brand, plan, customer, status, plan_quantity, chargebee_id, chargebee_object)
VALUES
($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id
