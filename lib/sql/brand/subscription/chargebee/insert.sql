INSERT INTO chargebee_subscriptions
(created_within, plan, customer, status, chargebee_id, chargebee_object)
VALUES
($1, $2, $3, $4, $5, $6)
RETURNING id
