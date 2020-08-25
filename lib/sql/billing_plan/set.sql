INSERT INTO billing_plans(chargebee_id, chargebee_object) VALUES ($1, $2)
ON CONFLICT(chargebee_id)
DO UPDATE SET chargebee_object = $2 WHERE billing_plans.chargebee_id = EXCLUDED.chargebee_id
RETURNING id
