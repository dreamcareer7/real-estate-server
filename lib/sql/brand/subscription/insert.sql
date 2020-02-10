INSERT INTO
brands_subscriptions(created_by, brand, "user", customer, plan, status, chargebee_id, chargebee_object, created_within, updated_within)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
RETURNING id
