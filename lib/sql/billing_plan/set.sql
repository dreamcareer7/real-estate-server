INSERT INTO billing_plans(acl, chargebee_id, chargebee_object) VALUES ($1, $2, $3)
ON CONFLICT(chargebee_id)
DO UPDATE SET chargebee_object = $3 WHERE billing_plans.chargebee_id = EXCLUDED.chargebee_id
RETURNING id
