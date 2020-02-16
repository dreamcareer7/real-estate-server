INSERT INTO
brands_subscriptions(created_by, created_within, brand, "user", chargebee)
VALUES ($1, $2, $3, $4, $5)
RETURNING id
